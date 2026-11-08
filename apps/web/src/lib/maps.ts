interface Pt { lat: number; lon: number }

const fmt = (p: Pt): string => `${p.lat},${p.lon}`;

export function googleMapsUrl(points: Pt[]): string | null {
    if (points.length < 2) return null;
    const pts = points.slice(0, 10); // ліміт Google: 8 проміжних точок
    const params = new URLSearchParams({
        api: '1',
        origin: fmt(pts[0]),
        destination: fmt(pts[pts.length - 1]),
        travelmode: 'walking',
    });
    const mid = pts.slice(1, -1).map(fmt).join('|');
    if (mid) params.set('waypoints', mid);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function appleMapsUrl(points: Pt[]): string | null {
    if (points.length < 2) return null;
    const params = new URLSearchParams({
        saddr: fmt(points[0]),
        daddr: fmt(points[points.length - 1]),
        dirflg: 'w',
    });
    return `https://maps.apple.com/?${params.toString()}`;
}