import { PrismaClient } from '@prisma/client';
import { selectCandidates, PoiRow, SelectionRequest } from '../src/engine/selection';
import { groupDbscan, groupKMeans } from '../src/engine/grouping';
import { evaluateGrouping } from '../src/engine/metrics';

const prisma = new PrismaClient();

async function main(): Promise<void> {
    const rows = await prisma.poi.findMany({
        select: {
            id: true, name: true, category: true, subcategory: true,
            lat: true, lon: true, defaultVisitMinutes: true, metadata: true,
        },
    });
    const pois = rows as unknown as PoiRow[];

    const req: SelectionRequest = {
        days: 3,
        hoursPerDay: 6,
        interests: ['art', 'history'],
        activityLevel: 'MEDIUM',
    };
    const cands = selectCandidates(pois, req);
    console.log(`Candidates: ${cands.length} (of ${pois.length} POIs)`);
    console.log('Top 8:');
    cands.forEach((c) => console.log(`  ${c.score}  ${c.category.padEnd(10)} ${c.name}`));

    const result = {
        'K-Means': evaluateGrouping(cands, groupKMeans(cands, req.days)),
        'DBSCAN (eps=700m)': evaluateGrouping(cands, groupDbscan(cands, req.days, 700, 2)),
        'DBSCAN (eps=400m)': evaluateGrouping(cands, groupDbscan(cands, req.days, 400, 2)),
    };
    console.table(
        Object.fromEntries(
            Object.entries(result).map(([k, v]) => [k, { ...v, sizes: v.sizes.join('/') }]),
        ),
    );
}

main().catch(console.error).finally(() => prisma.$disconnect());