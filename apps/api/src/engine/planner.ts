import { centroid, haversineM, LatLon } from './geo';
import { groupDbscan, groupKMeans, groupKMeansBalanced } from './grouping';
import { nearestNeighbor, twoOpt } from './tsp';
import { buildDay, DayPlan } from './schedule';
import { CITY_CENTER, selectCandidates, PoiRow, SelectionRequest } from './selection';

export type GroupingAlgo = 'kmeans' | 'dbscan';
export type OrderingAlgo = 'nn' | '2opt';

export interface PlanRequest extends SelectionRequest {
    grouping?: GroupingAlgo;
    ordering?: OrderingAlgo;
}

export interface RoutePlan {
    algorithm: string;
    days: DayPlan[];
    totalDistanceM: number;
}

export function nearestToCenter(points: LatLon[]): number {
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
        const d = haversineM(p, CITY_CENTER);
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    });
    return best;
}

export function orderPoints(points: LatLon[], ordering: OrderingAlgo): number[] {
    const nn = nearestNeighbor(points, nearestToCenter(points));
    return ordering === 'nn' ? nn : twoOpt(points, nn);
}

export function planRoute(pois: PoiRow[], req: PlanRequest): RoutePlan {
    const grouping = req.grouping ?? 'kmeans';
    const ordering = req.ordering ?? '2opt';

    const cands = selectCandidates(pois, req);
    if (cands.length === 0) {
        throw new Error('No suitable places found for the requested interests');
    }

    const minSize = Math.max(2, Math.floor(cands.length / req.days / 2));
    const groups = grouping === 'kmeans' ? groupKMeansBalanced(cands, req.days, 42, minSize) : groupDbscan(cands, req.days, 400, 2);

    const ordered = groups
        .filter((g) => g.length > 0)
        .map((g) => {
            const pts = g.map((i) => cands[i]);
            return orderPoints(pts, ordering).map((i) => pts[i]);
        });

    // День 1 це найцентральніша група
    ordered.sort(
        (a, b) => haversineM(centroid(a), CITY_CENTER) - haversineM(centroid(b), CITY_CENTER),
    );

    const foodPool = pois.filter((p) => p.category === 'RESTAURANT' || p.category === 'CAFE');
    const usedFood = new Set<string>();
    const days = ordered.map((sights, idx) =>
        buildDay({
            dayNumber: idx + 1,
            sights,
            hoursPerDay: req.hoursPerDay,
            wantCoffee: req.interests.includes('coffee'),
            foodPool,
            usedFood,
        }),
    );

    return {
        algorithm: `${grouping}+${ordering}`,
        days,
        totalDistanceM: days.reduce((s, d) => s + d.distanceM, 0),
    };
}