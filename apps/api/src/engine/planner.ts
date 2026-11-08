import { centroid, distM, haversineM, LatLon } from './geo';
import { groupDbscan, groupKMeansBalanced } from './grouping';
import { nearestNeighbor, pathLengthM, twoOpt } from './tsp';
import { buildDay, DayPlan } from './schedule';
import {
    CITY_CENTER, candidateLimit, rankCandidates, Candidate, PoiRow, SelectionRequest,
} from './selection';

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
    savedBy2optM: number; // на скільки 2-opt скоротив шлях відносно Nearest Neighbor
}

const FILL_TARGET = 0.8; // добираємо точки, поки день заповнений менш ніж на 80%
const FILL_RADIUS_M = 1500;

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

    const ranked = rankCandidates(pois, req);
    if (ranked.length === 0) {
        throw new Error('No suitable places found for the requested interests');
    }
    const limit = Math.min(ranked.length, candidateLimit(req));
    const cands = ranked.slice(0, limit);
    const reserve = ranked.slice(limit); // запас для добору точок у неповні дні

    const minSize = Math.max(2, Math.floor(cands.length / req.days / 2));
    const groups =
        grouping === 'kmeans'
            ? groupKMeansBalanced(cands, req.days, 42, minSize)
            : groupDbscan(cands, req.days, 400, 2);

    let savedBy2optM = 0;
    const orderGroup = (pts: Candidate[]): Candidate[] => {
        const nn = nearestNeighbor(pts, nearestToCenter(pts));
        const order = ordering === 'nn' ? nn : twoOpt(pts, nn);
        savedBy2optM += Math.max(0, pathLengthM(pts, nn) - pathLengthM(pts, order));
        return order.map((i) => pts[i]);
    };

    const ordered = groups
        .filter((g) => g.length > 0)
        .map((g) => g.map((i) => cands[i]));

    // День 1 це найцентральніша група
    ordered.sort((a, b) => haversineM(centroid(a), CITY_CENTER) - haversineM(centroid(b), CITY_CENTER));

    const foodPool = pois.filter((p) => p.category === 'RESTAURANT' || p.category === 'CAFE');
    const usedFood = new Set<string>();
    const limitMin = req.hoursPerDay * 60;
    const wantCoffee = req.interests.includes('coffee');

    const days: DayPlan[] = ordered.map((group, idx) => {
        const build = (sights: Candidate[], used: Set<string>): DayPlan =>
            buildDay({ dayNumber: idx + 1, sights, hoursPerDay: req.hoursPerDay, wantCoffee, foodPool, usedFood: used });

        let sights = orderGroup(group);
        let plan = build(sights, new Set(usedFood));
        let guard = 25;

        // Добір найближчих точок із запасу, поки день не заповнений на 80%+
        while (plan.durationMin < FILL_TARGET * limitMin && reserve.length > 0 && guard-- > 0) {
            const c = centroid(sights);
            let bi = -1;
            let bd = FILL_RADIUS_M;
            reserve.forEach((r, i) => {
                const d = distM(r, c);
                if (d < bd) {
                    bd = d;
                    bi = i;
                }
            });
            if (bi < 0) break;
            const [cand] = reserve.splice(bi, 1);
            const next = orderGroup([...sights, cand]);
            const nextPlan = build(next, new Set(usedFood));
            if (nextPlan.stops.length > plan.stops.length) {
                sights = next;
                plan = nextPlan;
            }
        }
        return build(sights, usedFood); // фінальна збірка фіксує вибрані обід і каву
    });

    return {
        algorithm: `${grouping}+${ordering}`,
        days,
        totalDistanceM: days.reduce((s, d) => s + d.distanceM, 0),
        savedBy2optM: Math.round(savedBy2optM),
    };
}