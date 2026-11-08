import type { PoiCategory } from '@prisma/client';

export interface OsmElement {
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
}

export interface MappedPoi {
    osmType: string;
    osmId: string;
    name: string;
    category: PoiCategory;
    subcategory: string | null;
    lat: number;
    lon: number;
    openingHours: string | null;
    website: string | null;
    address: string | null;
    defaultVisitMinutes: number;
    metadata: Record<string, string>;
}

// Типовий час відвідування (хвилини) для кожної категорії
const VISIT_MINUTES: Record<PoiCategory, number> = {
    MUSEUM: 90,
    ART: 60,
    ATTRACTION: 45,
    HISTORIC: 30,
    CHURCH: 30,
    PARK: 40,
    VIEWPOINT: 20,
    CAFE: 30,
    RESTAURANT: 60,
    BAR: 45,
    PHARMACY: 10,
};

function detectCategory(
    tags: Record<string, string>,
): { category: PoiCategory; subcategory: string } | null {
    if (tags.tourism === 'museum') return { category: 'MUSEUM', subcategory: 'museum' };
    if (tags.tourism === 'gallery') return { category: 'ART', subcategory: 'gallery' };
    if (tags.tourism === 'viewpoint') return { category: 'VIEWPOINT', subcategory: 'viewpoint' };
    if (tags.tourism === 'attraction') return { category: 'ATTRACTION', subcategory: 'attraction' };
    if (tags.historic) return { category: 'HISTORIC', subcategory: tags.historic };
    if (tags.amenity === 'place_of_worship') {
        return { category: 'CHURCH', subcategory: tags.religion ?? 'place_of_worship' };
    }
    if (tags.leisure === 'park' || tags.leisure === 'garden') {
        return { category: 'PARK', subcategory: tags.leisure };
    }
    if (tags.amenity === 'cafe') return { category: 'CAFE', subcategory: 'cafe' };
    if (tags.amenity === 'restaurant') {
        return { category: 'RESTAURANT', subcategory: tags.cuisine ?? 'restaurant' };
    }
    if (tags.amenity === 'bar') return { category: 'BAR', subcategory: 'bar' };
    if (tags.amenity === 'pharmacy') return { category: 'PHARMACY', subcategory: 'pharmacy' };
    return null;
}

export function mapOsmElement(el: OsmElement): MappedPoi | null {
    const tags = el.tags;
    if (!tags || !tags.name) return null;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) return null;

    const detected = detectCategory(tags);
    if (!detected) return null;

    const street = tags['addr:street'];
    const house = tags['addr:housenumber'];
    const address = street ? (house ? `${street}, ${house}` : street) : null;

    const metadata: Record<string, string> = {};
    const extraKeys = ['wikidata', 'wikipedia', 'cuisine', 'phone', 'wheelchair', 'name:en'];
    for (const key of extraKeys) {
        if (tags[key]) metadata[key] = tags[key];
    }

    return {
        osmType: el.type,
        osmId: String(el.id),
        name: tags.name,
        category: detected.category,
        subcategory: detected.subcategory,
        lat,
        lon,
        openingHours: tags.opening_hours ?? null,
        website: tags.website ?? tags['contact:website'] ?? null,
        address,
        defaultVisitMinutes: VISIT_MINUTES[detected.category],
        metadata,
    };
}