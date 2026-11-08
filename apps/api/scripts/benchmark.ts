import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LatLon } from '../src/engine/geo';
import { selectCandidates, PoiRow, SelectionRequest } from '../src/engine/selection';
import { groupDbscan, groupKMeans, groupKMeansBalanced, Groups } from '../src/engine/grouping';
import { evaluateGrouping } from '../src/engine/metrics';
import { nearestNeighbor, optimalOrder, pathLengthM, randomOrder, twoOpt } from '../src/engine/tsp';
import { nearestToCenter } from '../src/engine/planner';

const prisma = new PrismaClient();

const DAYS = [2, 3, 4, 5];
const INTERESTS = [
    ['art'],
    ['history'],
    ['art', 'history', 'architecture'],
    ['nature', 'history'],
];
const LEVELS = ['MEDIUM', 'HIGH'] as const;

const METHODS: Record<string, (p: LatLon[], d: number) => Groups> = {
    'K-Means': (p, d) => groupKMeans(p, d),
    'K-Means + balance': (p, d) => groupKMeansBalanced(p, d),
    'DBSCAN eps=400m': (p, d) => groupDbscan(p, d, 400, 2),
    'DBSCAN eps=700m': (p, d) => groupDbscan(p, d, 700, 2),
    'DBSCAN eps=1000m': (p, d) => groupDbscan(p, d, 1000, 2),
};

function time<T>(fn: () => T): [T, number] {
    const t0 = performance.now();
    const res = fn();
    return [res, performance.now() - t0];
}

function mdTable(rows: Record<string, string | number>[]): string {
    const cols = Object.keys(rows[0]);
    const head = `| ${cols.join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |`;
    const body = rows.map((r) => `| ${cols.map((c) => r[c]).join(' | ')} |`).join('\n');
    return `${head}\n${body}`;
}

async function main(): Promise<void> {
    const rows = await prisma.poi.findMany({
        select: {
            id: true, name: true, category: true, subcategory: true,
            lat: true, lon: true, defaultVisitMinutes: true, metadata: true,
        },
    });
    const pois = rows as unknown as PoiRow[];

    const g: Record<string, { n: number; cv: number; radius: number; span: number; singles: number; ms: number }> = {};
    for (const name of Object.keys(METHODS)) {
        g[name] = { n: 0, cv: 0, radius: 0, span: 0, singles: 0, ms: 0 };
    }
    const o: Record<string, { len: number; ms: number }> = {
        Random: { len: 0, ms: 0 },
        'Nearest Neighbor': { len: 0, ms: 0 },
        '2-opt': { len: 0, ms: 0 },
        'Optimal (brute force)': { len: 0, ms: 0 },
    };
    let scenarios = 0;
    let skipped = 0;
    let orderedGroups = 0;

    for (const days of DAYS) {
        for (const interests of INTERESTS) {
            for (const level of LEVELS) {
                const req: SelectionRequest = { days, hoursPerDay: 6, interests, activityLevel: level };
                const cands = selectCandidates(pois, req);
                if (cands.length < days * 2) {
                    skipped++;
                    continue;
                }
                scenarios++;

                let kmeansGroups: Groups = [];
                for (const [name, fn] of Object.entries(METHODS)) {
                    const [groups, ms] = time(() => fn(cands, days));
                    const m = evaluateGrouping(cands, groups);
                    const a = g[name];
                    a.n++;
                    a.cv += m.sizeCv;
                    a.radius += m.avgRadiusM;
                    a.span += m.maxSpanM;
                    a.singles += m.sizes.filter((s) => s <= 1).length;
                    a.ms += ms;
                    if (name === 'K-Means') kmeansGroups = groups;
                }

                for (const grp of kmeansGroups) {
                    if (grp.length < 3 || grp.length > 9) continue;
                    const pts = grp.map((i) => cands[i]);
                    orderedGroups++;
                    const start = nearestToCenter(pts);

                    const [rl, rms] = time(() => {
                        let s = 0;
                        for (let seed = 1; seed <= 20; seed++) s += pathLengthM(pts, randomOrder(pts.length, seed));
                        return s / 20;
                    });
                    o.Random.len += rl;
                    o.Random.ms += rms / 20;

                    const [nn, nnMs] = time(() => nearestNeighbor(pts, start));
                    o['Nearest Neighbor'].len += pathLengthM(pts, nn);
                    o['Nearest Neighbor'].ms += nnMs;

                    const [t2, t2Ms] = time(() => twoOpt(pts, nn));
                    o['2-opt'].len += pathLengthM(pts, t2);
                    o['2-opt'].ms += t2Ms;

                    const [opt, optMs] = time(() => optimalOrder(pts));
                    o['Optimal (brute force)'].len += pathLengthM(pts, opt);
                    o['Optimal (brute force)'].ms += optMs;
                }
            }
        }
    }

    const groupRows = Object.entries(g).map(([name, a]) => ({
        Method: name,
        'Avg size CV': (a.cv / a.n).toFixed(3),
        'Avg radius, m': Math.round(a.radius / a.n),
        'Avg max span, m': Math.round(a.span / a.n),
        'Days with <=1 point': a.singles,
        'Avg time, ms': (a.ms / a.n).toFixed(2),
    }));

    const optLen = o['Optimal (brute force)'].len;
    const orderRows = Object.entries(o).map(([name, a]) => ({
        Algorithm: name,
        'Avg path per day, m': Math.round(a.len / orderedGroups),
        'Over optimum, %': ((a.len / optLen - 1) * 100).toFixed(1),
        'Avg time, ms': (a.ms / orderedGroups).toFixed(3),
    }));

    console.log(`Scenarios: ${scenarios} (skipped ${skipped}), ordered groups: ${orderedGroups}`);
    console.log('\nA) Grouping into days');
    console.table(groupRows);
    console.log('\nB) Ordering within a day');
    console.table(orderRows);

    const dir = resolve(__dirname, '../../../docs');
    mkdirSync(dir, { recursive: true });
    const md = [
        '# Benchmark results',
        '',
        `Date: ${new Date().toISOString().slice(0, 10)}. Scenarios: ${scenarios} (skipped ${skipped} with too few candidates). Groups used for ordering: ${orderedGroups} (size 3-9).`,
        '',
        '## A) Grouping into days (lower CV = more even days; lower radius/span = more compact days)',
        '',
        mdTable(groupRows),
        '',
        '## B) Ordering within a day (open path, K-Means groups)',
        '',
        mdTable(orderRows),
        '',
    ].join('\n');
    writeFileSync(resolve(dir, 'benchmark-results.md'), md);
    console.log(`\nSaved: ${resolve(dir, 'benchmark-results.md')}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());