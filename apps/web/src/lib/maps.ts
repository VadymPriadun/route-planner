interface Pt { lat: number; lon: number; name?: string }

const coord = (p: Pt): string => `${p.lat},${p.lon}`;
// Для Google: назва + місто точніша за координати; без назви беремо координати
const place = (p: Pt): string => (p.name ? `${p.name}, Firenze` : coord(p));

export function googleMapsUrl(points: Pt[]): string | null {
    if (points.length < 2) return null;
    const pts = points.slice(0, 10);
    const params = new URLSearchParams({
        api: '1',
        origin: place(pts[0]),
        destination: place(pts[pts.length - 1]),
        travelmode: 'walking',
    });
    const mid = pts.slice(1, -1).map(place).join('|');
    if (mid) params.set('waypoints', mid);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function appleMapsUrl(points: Pt[]): string | null {
    if (points.length < 2) return null;
    const params = new URLSearchParams({
        saddr: coord(points[0]),
        daddr: coord(points[points.length - 1]),
        dirflg: 'w',
    });
    return `https://maps.apple.com/?${params.toString()}`;
}

export async function walkingGeometry(points: { lat: number; lon: number }[]): Promise<[number, number][] | null> {
    if (points.length < 2) return null;
    const coords = points.map((p) => `${p.lon},${p.lat}`).join(';');
    try {
        const res = await fetch(
            `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`,
            { signal: AbortSignal.timeout(8000) },
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.routes?.[0]?.geometry?.coordinates ?? null;
    } catch {
        return null;
    }
}