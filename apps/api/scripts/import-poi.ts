import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mapOsmElement, type MappedPoi, type OsmElement } from './lib/poi-mapping';

const prisma = new PrismaClient();

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

const CACHE_DIR = resolve(__dirname, '.cache');
const CACHE_FILE = resolve(CACHE_DIR, 'overpass-florence.json');

const QUERY = `
[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="8"]["name"="Firenze"]->.a;
(
  nwr["tourism"~"^(museum|gallery|attraction|viewpoint)$"]["name"](area.a);
  nwr["historic"~"^(monument|castle|memorial|ruins|archaeological_site|building|fort|city_gate)$"]["name"](area.a);
  nwr["amenity"="place_of_worship"]["name"]["wikidata"](area.a);
  nwr["leisure"~"^(park|garden)$"]["name"](area.a);
  nwr["amenity"~"^(cafe|restaurant|bar|pharmacy)$"]["name"](area.a);
);
out center tags;
`;

async function fetchOverpass(): Promise<OsmElement[]> {
    const refresh = process.argv.includes('--refresh');
    if (!refresh && existsSync(CACHE_FILE)) {
        console.log(`Using cached data: ${CACHE_FILE} (use --refresh to re-download)`);
        return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')).elements as OsmElement[];
    }

    let lastError: unknown;
    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            console.log(`Requesting Overpass: ${endpoint} (can take up to a minute)...`);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'travel-city-explorer-student-project/0.1',
                },
                body: new URLSearchParams({ data: QUERY }),
                signal: AbortSignal.timeout(200_000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            const json = (await res.json()) as { elements: OsmElement[] };
            mkdirSync(CACHE_DIR, { recursive: true });
            writeFileSync(CACHE_FILE, JSON.stringify(json));
            return json.elements;
        } catch (err) {
            console.warn(`Endpoint failed: ${endpoint}`, err);
            lastError = err;
        }
    }
    throw new Error(`All Overpass endpoints failed: ${String(lastError)}`);
}

async function upsertPoi(p: MappedPoi): Promise<void> {
    const metadata = JSON.stringify(p.metadata);
    await prisma.$executeRaw`
    INSERT INTO "Poi" (
      "id", "osmType", "osmId", "name", "category", "subcategory",
      "lat", "lon", "geom", "openingHours", "website", "address",
      "metadata", "defaultVisitMinutes", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, ${p.osmType}, ${p.osmId}, ${p.name},
      ${p.category}::"PoiCategory", ${p.subcategory},
      ${p.lat}::double precision, ${p.lon}::double precision,
      ST_SetSRID(ST_MakePoint(${p.lon}::double precision, ${p.lat}::double precision), 4326)::geography,
      ${p.openingHours}, ${p.website}, ${p.address},
      ${metadata}::jsonb, ${p.defaultVisitMinutes}::integer, NOW()
    )
    ON CONFLICT ("osmType", "osmId") DO UPDATE SET
      "name" = EXCLUDED."name",
      "category" = EXCLUDED."category",
      "subcategory" = EXCLUDED."subcategory",
      "lat" = EXCLUDED."lat",
      "lon" = EXCLUDED."lon",
      "geom" = EXCLUDED."geom",
      "openingHours" = EXCLUDED."openingHours",
      "website" = EXCLUDED."website",
      "address" = EXCLUDED."address",
      "metadata" = EXCLUDED."metadata",
      "defaultVisitMinutes" = EXCLUDED."defaultVisitMinutes",
      "updatedAt" = NOW()
  `;
}

async function main(): Promise<void> {
    const elements = await fetchOverpass();
    console.log(`Raw OSM elements: ${elements.length}`);

    // Прибираємо дублікати за (type, id) та об'єкти без потрібних даних
    const unique = new Map<string, MappedPoi>();
    let skipped = 0;
    for (const el of elements) {
        const mapped = mapOsmElement(el);
        if (!mapped) {
            skipped++;
            continue;
        }
        unique.set(`${mapped.osmType}/${mapped.osmId}`, mapped);
    }
    console.log(`Valid POIs: ${unique.size}, skipped: ${skipped}`);

    let done = 0;
    for (const poi of unique.values()) {
        await upsertPoi(poi);
        done++;
        if (done % 500 === 0) console.log(`  imported ${done}/${unique.size}`);
    }
    console.log(`Import finished: ${done} POIs written.`);
}

main()
    .catch((err) => {
        console.error('Import failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());