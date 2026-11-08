import { centroid, haversineM, LatLon } from './geo';
import type { Groups } from './grouping';

export interface GroupingMetrics {
    groups: number;
    sizes: number[];
    sizeCv: number; // коефіцієнт варіації розмірів: 0 = ідеально рівномірно
    avgRadiusM: number; // середня відстань точок до центру групи (компактність)
    maxSpanM: number; // найбільша відстань між двома точками в одній групі
}

export function evaluateGrouping(points: LatLon[], groups: Groups): GroupingMetrics {
    const sizes = groups.map((g) => g.length);
    const mean = sizes.reduce((s, v) => s + v, 0) / sizes.length;
    const std = Math.sqrt(sizes.reduce((s, v) => s + (v - mean) ** 2, 0) / sizes.length);

    let radiusSum = 0;
    let radiusCount = 0;
    let maxSpan = 0;
    for (const g of groups) {
        const pts = g.map((i) => points[i]);
        const c = centroid(pts);
        pts.forEach((p) => {
            radiusSum += haversineM(p, c);
            radiusCount++;
        });
        for (let i = 0; i < pts.length; i++)
            for (let j = i + 1; j < pts.length; j++)
                maxSpan = Math.max(maxSpan, haversineM(pts[i], pts[j]));
    }
    return {
        groups: groups.length,
        sizes,
        sizeCv: Number((std / mean).toFixed(3)),
        avgRadiusM: Math.round(radiusSum / radiusCount),
        maxSpanM: Math.round(maxSpan),
    };
}