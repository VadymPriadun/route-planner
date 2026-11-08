import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Координати Дуомо у Флоренції
const DUOMO = { lat: 43.7731, lon: 11.256 };
const RADIUS_M = 500;

async function main(): Promise<void> {
    const total = await prisma.poi.count();
    console.log(`Total POIs in DB: ${total}`);

    const byCategory = await prisma.poi.groupBy({
        by: ['category'],
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
    });
    console.log('\nBy category:');
    for (const row of byCategory) {
        console.log(`  ${row.category.padEnd(12)} ${row._count._all}`);
    }

    const missingGeom = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM "Poi" WHERE "geom" IS NULL
  `;
    console.log(`\nPOIs without geometry: ${missingGeom[0].count}`);

    const nearby = await prisma.$queryRaw<
        { name: string; category: string; distance: number }[]
    >`
    SELECT
      "name",
      "category"::text AS category,
      ST_Distance(
        "geom",
        ST_SetSRID(ST_MakePoint(${DUOMO.lon}::double precision, ${DUOMO.lat}::double precision), 4326)::geography
      ) AS distance
    FROM "Poi"
    WHERE ST_DWithin(
      "geom",
      ST_SetSRID(ST_MakePoint(${DUOMO.lon}::double precision, ${DUOMO.lat}::double precision), 4326)::geography,
      ${RADIUS_M}::double precision
    )
    ORDER BY distance
    LIMIT 10
  `;

    console.log(`\nClosest 10 POIs within ${RADIUS_M} m of the Duomo:`);
    for (const row of nearby) {
        console.log(`  ${Math.round(row.distance).toString().padStart(4)} m  ${row.category.padEnd(11)} ${row.name}`);
    }
}

main()
    .catch((err) => {
        console.error('Verification failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());