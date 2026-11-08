import { haversineM, LatLon } from './geo';

export function pathLengthM(points: LatLon[], order: number[]): number {
    let sum = 0;
    for (let i = 1; i < order.length; i++) {
        sum += haversineM(points[order[i - 1]], points[order[i]]);
    }
    return sum;
}

// Базовий алгоритм: щоразу йдемо до найближчої ще не відвіданої точки
export function nearestNeighbor(points: LatLon[], start = 0): number[] {
    if (points.length === 0) return [];
    const visited = new Set<number>([start]);
    const order = [start];
    while (order.length < points.length) {
        const last = points[order[order.length - 1]];
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < points.length; i++) {
            if (visited.has(i)) continue;
            const d = haversineM(last, points[i]);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        visited.add(best);
        order.push(best);
    }
    return order;
}

// 2-opt: розвертаємо відрізок маршруту, якщо це скорочує шлях; повторюємо до стабілізації
export function twoOpt(points: LatLon[], initial: number[]): number[] {
    let order = [...initial];
    let best = pathLengthM(points, order);
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < order.length - 1; i++) {
            for (let j = i + 1; j < order.length; j++) {
                const candidate = [
                    ...order.slice(0, i),
                    ...order.slice(i, j + 1).reverse(),
                    ...order.slice(j + 1),
                ];
                const len = pathLengthM(points, candidate);
                if (len < best - 1e-6) {
                    order = candidate;
                    best = len;
                    improved = true;
                }
            }
        }
    }
    return order;
}

// Випадковий порядок з seed (найгірший базовий рівень для порівняння)
export function randomOrder(n: number, seed: number): number[] {
    let a = seed;
    const rnd = (): number => {
        a = (a * 1664525 + 1013904223) % 4294967296;
        return a / 4294967296;
    };
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

// Точний оптимум повним перебором із відсіканням (лише для n <= 9)
export function optimalOrder(points: LatLon[]): number[] {
    const n = points.length;
    if (n > 9) throw new Error('optimalOrder supports at most 9 points');
    if (n <= 1) return points.map((_, i) => i);
    let best: number[] = [];
    let bestLen = Infinity;
    const used = new Array<boolean>(n).fill(false);
    const cur: number[] = [];
    const dfs = (len: number): void => {
        if (len >= bestLen) return;
        if (cur.length === n) {
            bestLen = len;
            best = [...cur];
            return;
        }
        for (let i = 0; i < n; i++) {
            if (used[i]) continue;
            const add = cur.length ? haversineM(points[cur[cur.length - 1]], points[i]) : 0;
            used[i] = true;
            cur.push(i);
            dfs(len + add);
            cur.pop();
            used[i] = false;
        }
    };
    dfs(0);
    return best;
}