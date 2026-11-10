import { describe, expect, it } from 'vitest';
import type { PoiCategory } from '@prisma/client';
import { nearestNeighbor, optimalOrder, pathLengthM, randomOrder, twoOpt } from './tsp';
import { buildDay } from './schedule';
import type { Candidate } from './selection';

function pseudoPoints(n: number, seed: number) {
    let a = seed;
    const rnd = (): number => {
        a = (a * 1664525 + 1013904223) % 4294967296;
        return a / 4294967296;
    };
    return Array.from({ length: n }, () => ({
        lat: 43.76 + rnd() * 0.02,
        lon: 11.24 + rnd() * 0.03,
    }));
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

describe('ordering algorithms', () => {
    it('every algorithm returns a permutation of all points', () => {
        const pts = pseudoPoints(7, 1);
        const nn = nearestNeighbor(pts, 0);
        for (const order of [nn, twoOpt(pts, nn), optimalOrder(pts), randomOrder(7, 3)]) {
            expect([...order].sort((x, y) => x - y)).toEqual(range(7));
        }
    });

    it('optimal <= 2-opt <= nearest neighbor', () => {
        for (let seed = 1; seed <= 5; seed++) {
            const pts = pseudoPoints(7, seed);
            const nn = nearestNeighbor(pts, 0);
            const lenNn = pathLengthM(pts, nn);
            const len2 = pathLengthM(pts, twoOpt(pts, nn));
            const lenOpt = pathLengthM(pts, optimalOrder(pts));
            expect(len2).toBeLessThanOrEqual(lenNn + 1e-6);
            expect(lenOpt).toBeLessThanOrEqual(len2 + 1e-6);
        }
    });
});

const sight = (id: string, lat: number, lon: number, minutes: number): Candidate => ({
    id,
    name: id,
    category: 'MUSEUM' as PoiCategory,
    subcategory: null,
    lat,
    lon,
    defaultVisitMinutes: minutes,
    metadata: null,
    score: 1,
});

const food = (id: string, category: PoiCategory, lat: number, lon: number): Candidate => ({
    ...sight(id, lat, lon, 30),
    category,
});

describe('schedule', () => {
    const foodPool = [
        food('r1', 'RESTAURANT', 43.7731, 11.2561),
        food('c1', 'CAFE', 43.7732, 11.2562),
    ];

    it('inserts lunch, keeps arrivals increasing and fits the day', () => {
        const sights = [
            sight('a', 43.773, 11.256, 90),
            sight('b', 43.7735, 11.2565, 90),
            sight('c', 43.7728, 11.2555, 90),
            sight('d', 43.7732, 11.2558, 90),
        ];
        const day = buildDay({
            dayNumber: 1,
            sights,
            hoursPerDay: 8,
            wantCoffee: false,
            interests: [],
            foodPool,
            usedFood: new Set(),
        });
        expect(day.stops.some((s) => s.kind === 'LUNCH')).toBe(true);
        const arrivals = day.stops.map((s) => s.arrival);
        expect([...arrivals].sort()).toEqual(arrivals);
        expect(day.durationMin).toBeLessThanOrEqual(8 * 60);
    });

    it('drops a sight that does not fit into a short day', () => {
        const sights = [sight('a', 43.773, 11.256, 90), sight('b', 43.7735, 11.2565, 90)];
        const day = buildDay({
            dayNumber: 1,
            sights,
            hoursPerDay: 2,
            wantCoffee: false,
            interests: [],
            foodPool,
            usedFood: new Set(),
        });
        expect(day.stops).toHaveLength(1);
        expect(day.dropped).toEqual(['b']);
    });
});