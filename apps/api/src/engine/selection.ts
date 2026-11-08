import type { PoiCategory } from '@prisma/client';
import { haversineM } from './geo';

export interface PoiRow {
    id: string;
    name: string;
    category: PoiCategory;
    subcategory: string | null;
    lat: number;
    lon: number;
    defaultVisitMinutes: number;
    metadata: Record<string, string> | null;
}

export interface Candidate extends PoiRow {
    score: number;
}

export interface SelectionRequest {
    days: number;
    hoursPerDay: number;
    interests: string[];
    activityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Категорії оглядових точок для кожного інтересу.
export const INTEREST_CATEGORIES: Record<string, PoiCategory[]> = {
    art: ['MUSEUM', 'ART', 'CHURCH', 'HISTORIC'],
    history: ['HISTORIC', 'CHURCH', 'MUSEUM', 'ATTRACTION'],
    architecture: ['CHURCH', 'ATTRACTION', 'HISTORIC'],
    nature: ['PARK', 'VIEWPOINT'],
    food: [],
    coffee: [],
    nightlife: [],
};

// Категорії, які вважаються «основними» для інтересу (отримують бонус)
const PRIMARY: Record<string, PoiCategory[]> = {
    art: ['MUSEUM', 'ART'],
    history: ['HISTORIC'],
    architecture: ['CHURCH'],
    nature: ['PARK', 'VIEWPOINT'],
};

const CATEGORY_WEIGHT: Partial<Record<PoiCategory, number>> = {
    MUSEUM: 5,
    ATTRACTION: 5,
    ART: 4,
    HISTORIC: 3,
    CHURCH: 3,
    VIEWPOINT: 3,
    PARK: 2,
};

const ACTIVITY_FACTOR = { LOW: 0.75, MEDIUM: 1, HIGH: 1.25 } as const;

export function pointsPerDay(req: SelectionRequest): number {
    const sightseeingHours = req.hoursPerDay - 1; // 1 година відведена на обід
    const slotMinutes = 45 + 20; // середній візит + дорога
    const raw = ((sightseeingHours * 60) / slotMinutes) * ACTIVITY_FACTOR[req.activityLevel];
    return Math.max(2, Math.round(raw));
}

function allowedCategories(interests: string[]): Set<PoiCategory> {
    const set = new Set<PoiCategory>();
    for (const i of interests) (INTEREST_CATEGORIES[i] ?? []).forEach((c) => set.add(c));
    if (set.size === 0) {
        set.add('ATTRACTION');
        set.add('MUSEUM');
    }
    return set;
}

// Правила відсіювання, виведені з аналізу даних OSM
export function isMeaningful(p: PoiRow): boolean {
    const hasWikidata = Boolean(p.metadata?.wikidata);
    if (p.category === 'HISTORIC') {
        if (p.subcategory === 'memorial') return false;
        if (p.subcategory === 'building' || p.subcategory === 'church') return hasWikidata;
        return true;
    }
    if (p.category === 'PARK') return hasWikidata;
    return true;
}
// П'яцца делла Синьорія: умовний центр міста
export const CITY_CENTER = { lat: 43.7696, lon: 11.2558 };

// Апріорне знання про місто: добре відомі пам'ятки Флоренції (допущення роботи)
const LANDMARKS = [
    'uffizi', 'accademia', 'santa maria del fiore', 'bargello', 'palazzo vecchio',
    'palazzo pitti', 'santa croce', 'cappelle medicee', 'ponte vecchio', 'campanile di giotto',
    'battistero', 'san lorenzo', 'santa maria novella', 'san miniato', 'boboli',
    'piazzale michelangelo', 'brancacci', 'orsanmichele',
];

export function isLandmark(name: string): boolean {
    const n = name.toLowerCase();
    return LANDMARKS.some((l) => n.includes(l));
}
export function popularityScore(
    p: PoiRow,
    interests: string[],
    activity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
): number {
    let score = CATEGORY_WEIGHT[p.category] ?? 1;
    if (p.metadata?.wikidata) score += 3;
    if (p.metadata?.wikipedia) score += 6;
    if (interests.some((i) => PRIMARY[i]?.includes(p.category))) score += 2;
    const centralityWeight = activity === 'HIGH' ? 1.5 : activity === 'LOW' ? 5 : 4;
    score += Math.max(0, centralityWeight - haversineM(p, CITY_CENTER) / 500);
    if (isLandmark(p.name)) score += 8;
    return Number(score.toFixed(2));
}

export function selectCandidates(pois: PoiRow[], req: SelectionRequest): Candidate[] {
    const allowed = allowedCategories(req.interests);
    const limit = Math.ceil(req.days * pointsPerDay(req) * 1.6);
    return pois
        .filter((p) => allowed.has(p.category) && isMeaningful(p))
        .map((p) => ({ ...p, score: popularityScore(p, req.interests, req.activityLevel) }))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, limit);
}