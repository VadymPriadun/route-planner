export interface LatLon {
    lat: number;
    lon: number;
}

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

const ARNO: [number, number][] = [
    [11.22, 43.7775], [11.232, 43.7752], [11.237, 43.773], [11.242, 43.7708],
    [11.2495, 43.7684], [11.2531, 43.768], [11.26, 43.7668], [11.2672, 43.764], [11.28, 43.761],
];
const BRIDGE_ZONE_DEG = 0.0004; // ~45 м: точки на мостах не належать жодному берегу
export const RIVER_CROSSING_PENALTY_M = 700;

// формула гаверсинуса
export function haversineM(a: LatLon, b: LatLon): number {
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function centroid(points: LatLon[]): LatLon {
    const n = points.length;
    return {
        lat: points.reduce((s, p) => s + p.lat, 0) / n,
        lon: points.reduce((s, p) => s + p.lon, 0) / n,
    };
}

export function riverLatAt(lon: number): number {
    if (lon <= ARNO[0][0]) return ARNO[0][1];
    for (let i = 1; i < ARNO.length; i++) {
        if (lon <= ARNO[i][0]) {
            const [x0, y0] = ARNO[i - 1];
            const [x1, y1] = ARNO[i];
            return y0 + ((lon - x0) / (x1 - x0)) * (y1 - y0);
        }
    }
    return ARNO[ARNO.length - 1][1];
}

// 1 = північ, -1 = південь (Ольтрарно), 0 = на мосту
export function riverSide(p: LatLon): 1 | -1 | 0 {
    const d = p.lat - riverLatAt(p.lon);
    if (Math.abs(d) < BRIDGE_ZONE_DEG) return 0;
    return d > 0 ? 1 : -1;
}

// Відстань для кластеризації й впорядкування: гаверсинус + штраф за перетин річки
export function distM(a: LatLon, b: LatLon): number {
    const sa = riverSide(a);
    const sb = riverSide(b);
    return haversineM(a, b) + (sa !== 0 && sb !== 0 && sa !== sb ? RIVER_CROSSING_PENALTY_M : 0);
}