import type { PoiCategory } from '@prisma/client';
import { haversineM } from './geo';
import { classifyDwell, visitMinutes, VisitMode } from './dwell';
import { dedupeByName } from './dedupe';

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
    visitMinutes?: number;
    outsideMin?: number;
    insideMin?: number;
    enterable?: boolean;
    inside?: boolean;
}

export interface SelectionRequest {
    days: number;
    hoursPerDay: number;
    interests: string[];
    activityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    visitMode?: VisitMode;
    queues?: boolean;
}

export const INTEREST_CATEGORIES: Record<string, PoiCategory[]> = {
    art: ['MUSEUM', 'ART', 'CHURCH', 'HISTORIC'],
    history: ['HISTORIC', 'CHURCH', 'MUSEUM', 'ATTRACTION'],
    architecture: ['CHURCH', 'ATTRACTION', 'HISTORIC'],
    nature: ['PARK', 'VIEWPOINT'],
    food: [],
    coffee: [],
    nightlife: [],
};

const PRIMARY: Record<string, PoiCategory[]> = {
    art: ['MUSEUM', 'ART'],
    history: ['HISTORIC'],
    architecture: ['CHURCH'],
    nature: ['PARK', 'VIEWPOINT'],
};

const CATEGORY_WEIGHT: Partial<Record<PoiCategory, number>> = {
    MUSEUM: 5, ATTRACTION: 5, ART: 4, HISTORIC: 3, CHURCH: 3, VIEWPOINT: 3, PARK: 2,
};

const ACTIVITY_FACTOR = { LOW: 0.75, MEDIUM: 1, HIGH: 1.25 } as const;

// Орієнтовний слот на одну точку (середній огляд + дорога), хв
const SLOT_MIN: Record<VisitMode, number> = { OUTSIDE: 24, MAIN: 50, ALL: 60 };

export function pointsPerDay(req: SelectionRequest): number {
    const sightseeingHours = req.hoursPerDay - 1; // 1 година на обід
    const slot = SLOT_MIN[req.visitMode ?? 'MAIN'];
    const raw = ((sightseeingHours * 60) / slot) * ACTIVITY_FACTOR[req.activityLevel];
    return Math.min(9, Math.max(2, Math.round(raw)));
}

export function candidateLimit(req: SelectionRequest): number {
    return Math.ceil(req.days * pointsPerDay(req) * 1.6);
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

export function isMeaningful(p: PoiRow): boolean {
    if (/caff[eè]|cafe|giubbe rosse|ristorante|trattoria|osteria|pizzeria|gelateria/i.test(p.name)) {
        return false;
    }
    const hasWikidata = Boolean(p.metadata?.wikidata);

    if (p.category === 'HISTORIC') {
        if (p.subcategory === 'memorial') return false;
        if (p.subcategory === 'building' || p.subcategory === 'church') {
            return hasWikidata && Boolean(p.metadata?.wikipedia);
        }

        if (/^(palazzo|torre|villa) /i.test(p.name) &&
            !p.metadata?.wikipedia &&
            !isLandmark(p.name)) {
            return false;
        }
        return true;
    }

    if (p.category === 'PARK') {
        return hasWikidata && Boolean(p.metadata?.wikipedia);
    }

    if (p.category === 'CHURCH') {
        return Boolean(p.metadata?.wikipedia) || isLandmark(p.name);
    }

    return true;
}


// П'яцца делла Синьорія: умовний центр міста
export const CITY_CENTER = { lat: 43.7696, lon: 11.2558 };

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

export function rankCandidates(pois: PoiRow[], req: SelectionRequest): Candidate[] {
    const allowed = allowedCategories(req.interests);
    const mode = req.visitMode ?? 'MAIN';
    const queues = req.queues ?? false;

    const MAX_FROM_CENTER = {
        LOW: 2200,
        MEDIUM: 3500,
        HIGH: 5000,
    }[req.activityLevel];

    const scored = pois
        .filter(
            (p) =>
                (allowed.has(p.category) && isMeaningful(p)) &&
                (haversineM(p, CITY_CENTER) <= MAX_FROM_CENTER ||
                    isLandmark(p.name))
        )
        .map((p) => ({
            ...p,
            score: popularityScore(p, req.interests, req.activityLevel),
        }))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    return dedupeByName(scored, 150).map((p) => {
        const d = classifyDwell(p);
        const v = visitMinutes(d, mode, queues);

        return {
            ...p,
            visitMinutes: v.minutes,
            outsideMin: d.outsideMin,
            insideMin: d.insideMin + (queues ? d.queueMin : 0),
            enterable: d.enterable,
            inside: v.inside,
        };
    });
}


export function selectCandidates(pois: PoiRow[], req: SelectionRequest): Candidate[] {
    return rankCandidates(pois, req).slice(0, candidateLimit(req));
}