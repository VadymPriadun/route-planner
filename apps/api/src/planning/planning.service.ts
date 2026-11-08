import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { planRoute, PlanRequest, RoutePlan } from '../engine/planner';
import type { PoiRow } from '../engine/selection';

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(req: PlanRequest): Promise<RoutePlan> {
    const rows = await this.prisma.poi.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        subcategory: true,
        lat: true,
        lon: true,
        defaultVisitMinutes: true,
        metadata: true,
      },
    });
    return planRoute(rows as unknown as PoiRow[], req);
  }
}
