import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async check(): Promise<{ status: string; postgis: string }> {
        const rows = await this.prisma.$queryRaw<{ postgis: string }[]>`
      SELECT PostGIS_Version() AS postgis
    `;
        return { status: 'ok', postgis: rows[0].postgis };
    }
}