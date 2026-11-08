import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';

export interface NearbyPoi {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    lat: number;
    lon: number;
    openingHours: string | null;
    website: string | null;
    address: string | null;
    distanceM: number;
}

@Injectable()
export class PoiService {
    constructor(private readonly prisma: PrismaService) {}

    async findNearby(q: NearbyQueryDto): Promise<NearbyPoi[]> {
        const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${q.lon}::double precision, ${q.lat}::double precision), 4326)::geography`;
        const categoryFilter =
            q.categories && q.categories.length > 0
                ? Prisma.sql`AND "category"::text IN (${Prisma.join(q.categories)})`
                : Prisma.empty;

        const rows = await this.prisma.$queryRaw<NearbyPoi[]>`
      SELECT
        "id", "name", "category"::text AS category, "subcategory",
        "lat", "lon", "openingHours", "website", "address",
        ST_Distance("geom", ${point}) AS "distanceM"
      FROM "Poi"
      WHERE ST_DWithin("geom", ${point}, ${q.radius}::double precision)
      ${categoryFilter}
      ORDER BY "distanceM"
      LIMIT ${q.limit}::integer
    `;
        return rows.map((r) => ({ ...r, distanceM: Math.round(r.distanceM) }));
    }

    async findOne(id: string) {
        const poi = await this.prisma.poi.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                category: true,
                subcategory: true,
                lat: true,
                lon: true,
                openingHours: true,
                website: true,
                address: true,
                metadata: true,
                defaultVisitMinutes: true,
            },
        });
        if (!poi) throw new NotFoundException('POI not found');
        return poi;
    }
}