export interface LatLon {
    lat: number;
    lon: number;
}

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number): number => (deg * Math.PI) / 180;
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