import {
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanningService } from '../planning/planning.service';
import { CreateRouteDto } from './dto/create-route.dto';

@Injectable()
export class RoutesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly planning: PlanningService,
    ) {}

    async create(userId: string, dto: CreateRouteDto) {
        const route = await this.prisma.route.create({
            data: {
                userId,
                city: dto.city,
                days: dto.days,
                hoursPerDay: dto.hoursPerDay,
                activityLevel: dto.activityLevel,
                interests: dto.interests,
                requestText: dto.requestText,
                status: 'PROCESSING',
            },
        });

        try {
            const plan = await this.planning.generate({
                days: dto.days,
                hoursPerDay: dto.hoursPerDay,
                interests: dto.interests,
                activityLevel: dto.activityLevel,
                grouping: dto.grouping,
                ordering: dto.ordering,
            });

            await this.prisma.$transaction(async (tx) => {
                for (const day of plan.days) {
                    await tx.routeDay.create({
                        data: {
                            routeId: route.id,
                            dayNumber: day.dayNumber,
                            distanceM: day.distanceM,
                            durationMin: day.durationMin,
                            points: {
                                create: day.stops.map((s, idx) => ({
                                    poiId: s.poiId,
                                    order: idx + 1,
                                    arrivalTime: s.arrival,
                                    visitMinutes: s.visitMinutes,
                                    note: s.kind,
                                })),
                            },
                        },
                    });
                }
                await tx.route.update({
                    where: { id: route.id },
                    data: {
                        status: 'COMPLETED',
                        algorithm: plan.algorithm,
                        totalDistanceM: plan.totalDistanceM,
                    },
                });
            });
        } catch (err) {
            await this.prisma.route.update({ where: { id: route.id }, data: { status: 'FAILED' } });
            throw new UnprocessableEntityException(
                err instanceof Error ? err.message : 'Route generation failed',
            );
        }

        return this.findOne(userId, route.id);
    }

    findAll(userId: string) {
        return this.prisma.route.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(userId: string, id: string) {
        const route = await this.prisma.route.findFirst({
            where: { id, userId },
            include: {
                routeDays: {
                    orderBy: { dayNumber: 'asc' },
                    include: {
                        points: {
                            orderBy: { order: 'asc' },
                            include: {
                                poi: {
                                    select: {
                                        id: true,
                                        name: true,
                                        category: true,
                                        lat: true,
                                        lon: true,
                                        address: true,
                                        website: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!route) throw new NotFoundException('Route not found');
        return route;
    }

    async remove(userId: string, id: string): Promise<void> {
        const result = await this.prisma.route.deleteMany({ where: { id, userId } });
        if (result.count === 0) throw new NotFoundException('Route not found');
    }
}