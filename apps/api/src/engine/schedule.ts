import type { PoiCategory } from '@prisma/client';
import { haversineM, LatLon } from './geo';
import type { Candidate, PoiRow } from './selection';

export const WALK_FACTOR = 1.3;
export const WALK_M_PER_MIN = 80;
export const DAY_START_MIN = 9 * 60;

export type StopKind = 'SIGHT' | 'LUNCH' | 'COFFEE';

export interface Stop {
    poiId: string;
    name: string;
    category: string;
    lat: number;
    lon: number;
    kind: StopKind;
    arrival: string;
    visitMinutes: number;
    outsideMin?: number;
    insideMin?: number;
    enterable?: boolean;
    inside?: boolean;
}

export interface DayPlan {
    dayNumber: number;
    stops: Stop[];
    distanceM: number;
    durationMin: number;
    dropped: string[];
}

interface BreakRule {
    kind: 'LUNCH' | 'COFFEE';
    fromMin: number;
    minutes: number;
    category: PoiCategory;
}

export interface BuildDayInput {
    dayNumber: number;
    sights: Candidate[];
    hoursPerDay: number;
    wantCoffee: boolean;
    foodPool: PoiRow[];
    usedFood: Set<string>;
}

export function fmt(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const walkM = (a: LatLon, b: LatLon): number => haversineM(a, b) * WALK_FACTOR;
const walkMin = (a: LatLon, b: LatLon): number => Math.ceil(walkM(a, b) / WALK_M_PER_MIN);

function nearestFood(from: LatLon, pool: PoiRow[], used: Set<string>, category: PoiCategory): PoiRow | null {
    let best: PoiRow | null = null;
    let bestD = Infinity;
    for (const p of pool) {
        if (p.category !== category || used.has(p.id)) continue;
        const d = haversineM(from, p);
        if (d < bestD) {
            bestD = d;
            best = p;
        }
    }
    return best;
}

export function buildDay(input: BuildDayInput): DayPlan {
    const { sights, hoursPerDay, foodPool, usedFood } = input;
    const endMin = DAY_START_MIN + hoursPerDay * 60;
    const rules: BreakRule[] = [
        { kind: 'LUNCH', fromMin: 12 * 60 + 30, minutes: 60, category: 'RESTAURANT' },
    ];
    if (input.wantCoffee) {
        rules.push({ kind: 'COFFEE', fromMin: 15 * 60, minutes: 30, category: 'CAFE' });
    }

    const done = new Set<string>();
    const stops: Stop[] = [];
    const dropped: string[] = [];
    let t = DAY_START_MIN;
    let prev: LatLon | null = null;
    let dist = 0;

    const place = (poi: PoiRow, kind: StopKind, minutes: number, extra: Partial<Stop> = {}): boolean => {
        const arrive = t + (prev ? walkMin(prev, poi) : 0);
        if (arrive + minutes > endMin) return false;
        if (prev) dist += walkM(prev, poi);
        stops.push({
            poiId: poi.id,
            name: poi.name,
            category: poi.category,
            lat: poi.lat,
            lon: poi.lon,
            kind,
            arrival: fmt(arrive),
            visitMinutes: minutes,
            ...extra,
        });
        t = arrive + minutes;
        prev = poi;
        return true;
    };

    const takeBreaks = (): void => {
        for (const r of rules) {
            if (done.has(r.kind) || t < r.fromMin) continue;
            const from: LatLon | undefined = prev ?? sights[0];
            if (!from) return;
            const spot = nearestFood(from, foodPool, usedFood, r.category);
            if (spot && place(spot, r.kind, r.minutes)) {
                usedFood.add(spot.id);
                done.add(r.kind);
            }
        }
    };

    for (const s of sights) {
        takeBreaks();
        const ok = place(s, 'SIGHT', s.visitMinutes ?? s.defaultVisitMinutes, {
            outsideMin: s.outsideMin,
            insideMin: s.insideMin,
            enterable: s.enterable,
            inside: s.inside,
        });
        if (!ok) dropped.push(s.name);
    }
    takeBreaks();

    return {
        dayNumber: input.dayNumber,
        stops,
        distanceM: Math.round(dist),
        durationMin: stops.length > 0 ? t - DAY_START_MIN : 0,
        dropped,
    };
}