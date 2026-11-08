import { describe, expect, it } from 'vitest';
import { classifyDwell, visitMinutes } from './dwell';
import { dedupeByName, similarNames } from './dedupe';
import { distM, haversineM } from './geo';

const poi = (name: string, category: string, subcategory: string | null = null) => ({
    name, category, subcategory, metadata: null,
});

describe('dwell time', () => {
    it('gives a gate 5 minutes and no interior', () => {
        const d = classifyDwell(poi('Porta San Miniato', 'HISTORIC', 'city_gate'));
        expect(d.outsideMin).toBe(5);
        expect(d.enterable).toBe(false);
    });
    it('treats an ordinary palazzo as an exterior-only stop', () => {
        const d = classifyDwell(poi("Palazzo dell'Arte della Lana", 'HISTORIC', 'building'));
        expect(visitMinutes(d, 'ALL', false).minutes).toBeLessThanOrEqual(15);
    });
    it('Uffizi: 15 outside, 120 inside, +40 with queue', () => {
        const d = classifyDwell(poi('Galleria degli Uffizi', 'MUSEUM'));
        expect(visitMinutes(d, 'OUTSIDE', true).minutes).toBe(15);
        expect(visitMinutes(d, 'ALL', false).minutes).toBe(120);
        expect(visitMinutes(d, 'ALL', true).minutes).toBe(160);
    });
});

describe('deduplication', () => {
    it('matches the Ventaglio park duplicates', () => {
        expect(similarNames('Parco di Villa il Ventaglio', 'parco del ventaglio')).toBe(true);
    });
    it('does not merge short or different names', () => {
        expect(similarNames('M1', 'M10')).toBe(false);
        expect(similarNames('Palazzo Pitti', 'Palazzo Strozzi')).toBe(false);
    });
    it('merges only inside the radius', () => {
        const a = { name: 'Parco di Villa il Ventaglio', lat: 43.79, lon: 11.29 };
        const near = { name: 'parco del ventaglio', lat: 43.7905, lon: 11.2905 };
        const far = { name: 'parco del ventaglio', lat: 43.8, lon: 11.3 };
        expect(dedupeByName([a, near])).toHaveLength(1);
        expect(dedupeByName([a, far])).toHaveLength(2);
    });
});

describe('Arno crossing penalty', () => {
    const duomo = { lat: 43.7731, lon: 11.256 };
    const piazzale = { lat: 43.7629, lon: 11.265 };
    const uffizi = { lat: 43.7677, lon: 11.2553 };
    it('penalises points on opposite banks', () => {
        expect(distM(duomo, piazzale)).toBeGreaterThan(haversineM(duomo, piazzale) + 500);
    });
    it('does not penalise points on the same bank', () => {
        expect(distM(duomo, { lat: 43.7735, lon: 11.2565 })).toBeCloseTo(
            haversineM(duomo, { lat: 43.7735, lon: 11.2565 }),
            5,
        );
    });
    it('treats a bridge point as neutral', () => {
        const vecchio = { lat: 43.768, lon: 11.2531 };
        expect(distM(vecchio, piazzale)).toBeCloseTo(haversineM(vecchio, piazzale), 5);
        expect(uffizi).toBeDefined();
    });
});