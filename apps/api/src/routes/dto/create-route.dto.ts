import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { ActivityLevel } from '@prisma/client';

export const INTERESTS = ['art', 'history', 'architecture', 'nature', 'food', 'coffee', 'nightlife'] as const;

export class CreateRouteDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    city: string;

    @IsInt()
    @Min(1)
    @Max(7)
    days: number;

    @IsInt()
    @Min(2)
    @Max(12)
    hoursPerDay: number;

    @IsEnum(ActivityLevel)
    activityLevel: ActivityLevel;

    @IsArray()
    @ArrayMaxSize(10)
    @IsIn(INTERESTS, { each: true })
    interests: string[];

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    requestText?: string;

    @IsOptional()
    @IsIn(['kmeans', 'dbscan'])
    grouping?: 'kmeans' | 'dbscan';

    @IsOptional()
    @IsIn(['nn', '2opt'])
    ordering?: 'nn' | '2opt';
}