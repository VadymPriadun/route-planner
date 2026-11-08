import { centroid, haversineM, LatLon } from './geo';

// Генератор псевдовипадкових чисел із seed: однаковий seed дає однаковий результат
function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function initPlusPlus(points: LatLon[], k: number, rand: () => number): LatLon[] {
    const centers: LatLon[] = [points[Math.floor(rand() * points.length)]];
    while (centers.length < k) {
        const d2 = points.map((p) => Math.min(...centers.map((c) => haversineM(p, c))) ** 2);
        const total = d2.reduce((s, v) => s + v, 0);
        let r = rand() * total;
        let idx = 0;
        for (; idx < d2.length - 1; idx++) {
            r -= d2[idx];
            if (r <= 0) break;
        }
        centers.push(points[idx]);
    }
    return centers;
}

export interface KMeansResult {
    labels: number[];
    centroids: LatLon[];
}

export function kmeans(points: LatLon[], k: number, seed = 42, maxIter = 100): KMeansResult {
    if (points.length === 0) return { labels: [], centroids: [] };
    const kk = Math.min(k, points.length);
    const rand = mulberry32(seed);
    let centroids = initPlusPlus(points, kk, rand);
    let labels = new Array<number>(points.length).fill(-1);

    for (let iter = 0; iter < maxIter; iter++) {
        // 1. Кожну точку віддаємо найближчому центру
        const next = points.map((p) => {
            let best = 0;
            let bestD = Infinity;
            centroids.forEach((c, i) => {
                const d = haversineM(p, c);
                if (d < bestD) {
                    bestD = d;
                    best = i;
                }
            });
            return best;
        });
        const changed = next.some((l, i) => l !== labels[i]);
        labels = next;
        if (!changed) break;

        // 2. Перераховуємо центри
        centroids = centroids.map((old, i) => {
            const members = points.filter((_, j) => labels[j] === i);
            return members.length > 0 ? centroid(members) : old;
        });

        // 3. Порожній кластер віддаємо йому найвіддаленішу від свого центру точку
        for (let i = 0; i < kk; i++) {
            if (labels.includes(i)) continue;
            let far = 0;
            let farD = -1;
            points.forEach((p, j) => {
                const d = haversineM(p, centroids[labels[j]]);
                if (d > farD) {
                    farD = d;
                    far = j;
                }
            });
            labels[far] = i;
            centroids[i] = points[far];
        }
    }
    return { labels, centroids };
}