import type { RouteDayDto } from './types';

const WALK_FACTOR = 1.3;
const WALK_M_PER_MIN = 80;

const rad = (d: number): number => (d * Math.PI) / 180;
function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    const h =
        Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}

const fmt = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export interface Overrides { [pointId: string]: boolean } // true = всередині

// Перераховує час приходу й тривалість; порядок точок не змінюється
export function recompute(day: RouteDayDto, overrides: Overrides) {
    let t = 9 * 60;
    let prev: { lat: number; lon: number } | null = null;
    const rows = day.points.map((p) => {
        const inside = p.enterable ? (overrides[p.id] ?? p.inside) : false;
        const minutes =
            p.note === 'SIGHT' && p.enterable && p.outsideMin !== null && p.insideMin !== null
                ? inside ? p.insideMin : p.outsideMin
                : p.visitMinutes;
        const walk = prev ? Math.ceil((haversine(prev, p.poi) * WALK_FACTOR) / WALK_M_PER_MIN) : 0;
        t += walk;
        const row = { id: p.id, arrival: fmt(t), minutes, inside };
        t += minutes;
        prev = p.poi;
        return row;
    });
    return { rows, totalMin: t - 9 * 60 };
}