import { distM as haversineM, LatLon } from './geo';

export const NOISE = -1;

export function dbscan(points: LatLon[], epsM: number, minPts: number): number[] {
    const UNVISITED = -2;
    const labels = new Array<number>(points.length).fill(UNVISITED);

    const neighbors = (i: number): number[] => {
        const res: number[] = [];
        for (let j = 0; j < points.length; j++) {
            if (haversineM(points[i], points[j]) <= epsM) res.push(j);
        }
        return res;
    };

    let cluster = 0;
    for (let i = 0; i < points.length; i++) {
        if (labels[i] !== UNVISITED) continue;
        const nbrs = neighbors(i);
        if (nbrs.length < minPts) {
            labels[i] = NOISE;
            continue;
        }
        labels[i] = cluster;
        const queue = [...nbrs];
        while (queue.length > 0) {
            const j = queue.shift() as number;
            if (labels[j] === NOISE) labels[j] = cluster; // прикордонна точка
            if (labels[j] !== UNVISITED) continue;
            labels[j] = cluster;
            const jn = neighbors(j);
            if (jn.length >= minPts) queue.push(...jn);
        }
        cluster++;
    }
    return labels;
}