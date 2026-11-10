import { describe, expect, it } from 'vitest';
import { haversineM } from './geo';
import { kmeans } from './kmeans';
import { dbscan, NOISE } from './dbscan';
import { groupDbscan, groupKMeans } from './grouping';
import { isMeaningful, pointsPerDay, selectCandidates, PoiRow } from './selection';

// Дві щільні групи у Флоренції (Дуомо та П'яццале Мікеланджело) + одна далека точка
const duomo = [
    { lat: 43.7731, lon: 11.256 },
    { lat: 43.7735, lon: 11.2565 },
    { lat: 43.7728, lon: 11.2555 },
];
const hill = [
    { lat: 43.7629, lon: 11.2650 },
    { lat: 43.7632, lon: 11.2655 },
    { lat: 43.7626, lon: 11.2645 },
];
const lonely = { lat: 43.8, lon: 11.2 };

const row = (over: Partial<PoiRow>): PoiRow => ({
    id: 'x',
    name: 'X',
    category: 'MUSEUM',
    subcategory: null,
    lat: 43.77,
    lon: 11.25,
    defaultVisitMinutes: 60,
    metadata: null,
    ...over,
});

describe('haversineM', () => {
    it('returns 0 for the same point', () => {
        expect(haversineM(duomo[0], duomo[0])).toBe(0);
    });
    it('gives roughly 1.3 km between Duomo and Piazzale Michelangelo', () => {
        const d = haversineM(duomo[0], hill[0]);
        expect(d).toBeGreaterThan(1300);
        expect(d).toBeLessThan(1400);
    });
});

describe('kmeans', () => {
    it('separates two distant groups', () => {
        const pts = [...duomo, ...hill];
        const { labels } = kmeans(pts, 2);
        expect(new Set(labels.slice(0, 3)).size).toBe(1);
        expect(new Set(labels.slice(3)).size).toBe(1);
        expect(labels[0]).not.toBe(labels[3]);
    });
    it('is deterministic for the same seed', () => {
        const pts = [...duomo, ...hill, lonely];
        expect(kmeans(pts, 2, 7).labels).toEqual(kmeans(pts, 2, 7).labels);
    });
});

describe('dbscan', () => {
    it('finds two clusters and marks the lonely point as noise', () => {
        const pts = [...duomo, ...hill, lonely];
        const labels = dbscan(pts, 300, 2);
        expect(new Set(labels.slice(0, 3)).size).toBe(1);
        expect(new Set(labels.slice(3, 6)).size).toBe(1);
        expect(labels[6]).toBe(NOISE);
    });
});

describe('grouping', () => {
    const pts = [...duomo, ...hill, lonely];
    it('KMeans returns exactly N non-empty groups covering all points', () => {
        const g = groupKMeans(pts, 3);
        expect(g).toHaveLength(3);
        expect(g.flat().sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });
    it('DBSCAN grouping returns exactly N groups covering all points', () => {
        for (const days of [1, 2, 3]) {
            const g = groupDbscan(pts, days, 300, 2);
            expect(g).toHaveLength(days);
            expect(g.flat().sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
        }
    });
});

describe('selection', () => {
    it('drops memorials and buildings without wikidata', () => {
        expect(isMeaningful(row({ category: 'HISTORIC', subcategory: 'memorial' }))).toBe(false);
        expect(isMeaningful(row({ category: 'HISTORIC', subcategory: 'building' }))).toBe(false);
        expect(
    isMeaningful(
        row({
            category: 'HISTORIC',
            subcategory: 'building',
            metadata: {
                wikidata: 'Q1',
                wikipedia: 'en:Historic_Building',
            },
        }),
    ),
).toBe(true);
	expect(
    isMeaningful(
        row({
            category: 'HISTORIC',
            subcategory: 'building',
            metadata: { wikidata: 'Q1' },
        }),
    ),
).toBe(false);
        expect(isMeaningful(row({ category: 'HISTORIC', subcategory: 'city_gate' }))).toBe(true);
    });
    it('limits the number of points by days and activity', () => {
        const many = Array.from({ length: 100 }, (_, i) => row({ id: String(i), name: `M${i}` }));
        const low = selectCandidates(many, { days: 2, hoursPerDay: 6, interests: ['art'], activityLevel: 'LOW' });
        const high = selectCandidates(many, { days: 2, hoursPerDay: 6, interests: ['art'], activityLevel: 'HIGH' });
        expect(low.length).toBeLessThan(high.length);
    });
    it('computes points per day sensibly', () => {
        expect(pointsPerDay({ days: 1, hoursPerDay: 6, interests: [], activityLevel: 'MEDIUM' })).toBe(6);
    });
});
