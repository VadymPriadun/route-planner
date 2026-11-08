import { centroid, haversineM, LatLon } from './geo';
import { kmeans } from './kmeans';
import { dbscan, NOISE } from './dbscan';

export type Groups = number[][]; // кожна група це список індексів точок

export function groupKMeans(points: LatLon[], days: number, seed = 42): Groups {
    const { labels } = kmeans(points, days, seed);
    const groups: Groups = Array.from({ length: Math.min(days, points.length) }, () => []);
    labels.forEach((l, i) => groups[l].push(i));
    return groups;
}

export function groupKMeansBalanced(points: LatLon[], days: number, seed = 42, minSize = 3): Groups {
    const groups = groupKMeans(points, days, seed);
    const center = (g: number[]): LatLon => centroid(g.map((i) => points[i]));
    let guard = points.length * days;
    while (guard-- > 0) {
        const small = groups.findIndex((g) => g.length < minSize);
        if (small === -1 || groups[small].length === 0) break;
        const target = center(groups[small]);
        let bestG = -1;
        let bestIdx = -1;
        let bestD = Infinity;
        groups.forEach((g, gi) => {
            if (gi === small || g.length <= minSize) return;
            g.forEach((pi, idx) => {
                const d = haversineM(points[pi], target);
                if (d < bestD) {
                    bestD = d;
                    bestG = gi;
                    bestIdx = idx;
                }
            });
        });
        if (bestG === -1) break;
        groups[small].push(groups[bestG].splice(bestIdx, 1)[0]);
    }
    return groups;
}

export function groupDbscan(
    points: LatLon[],
    days: number,
    epsM = 700,
    minPts = 2,
): Groups {
    const labels = dbscan(points, epsM, minPts);
    const maxLabel = Math.max(...labels, NOISE);
    if (maxLabel < 0) return groupKMeans(points, days); // усе шум: запасний варіант

    let groups: Groups = Array.from({ length: maxLabel + 1 }, () => []);
    const noise: number[] = [];
    labels.forEach((l, i) => (l === NOISE ? noise.push(i) : groups[l].push(i)));

    const center = (g: number[]): LatLon => centroid(g.map((i) => points[i]));

    // 1. Шум -> найближчий кластер
    for (const i of noise) {
        let best = 0;
        let bestD = Infinity;
        groups.forEach((g, gi) => {
            const d = haversineM(points[i], center(g));
            if (d < bestD) {
                bestD = d;
                best = gi;
            }
        });
        groups[best].push(i);
    }

    // 2. Забагато кластерів -> зливаємо два найближчі за центрами
    while (groups.length > days) {
        let bi = 0;
        let bj = 1;
        let bd = Infinity;
        for (let i = 0; i < groups.length; i++) {
            for (let j = i + 1; j < groups.length; j++) {
                const d = haversineM(center(groups[i]), center(groups[j]));
                if (d < bd) {
                    bd = d;
                    bi = i;
                    bj = j;
                }
            }
        }
        groups[bi] = [...groups[bi], ...groups[bj]];
        groups = groups.filter((_, idx) => idx !== bj);
    }

    // 3. Замало кластерів -> ділимо найбільший через K-Means (k=2)
    while (groups.length < days) {
        groups.sort((a, b) => b.length - a.length);
        const biggest = groups[0];
        if (biggest.length < 2) break;
        const { labels: sub } = kmeans(biggest.map((i) => points[i]), 2);
        const a = biggest.filter((_, idx) => sub[idx] === 0);
        const b = biggest.filter((_, idx) => sub[idx] === 1);
        if (a.length === 0 || b.length === 0) break;
        groups = [a, b, ...groups.slice(1)];
    }
    return groups;
}