import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PoiCategory } from '@prisma/client';

export class NearbyQueryDto {
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat: number;

    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    lon: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(10)
    @Max(5000)
    radius: number = 500;

    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.split(',').map((v) => v.trim().toUpperCase()) : value,
    )
    @IsEnum(PoiCategory, { each: true })
    categories?: PoiCategory[];

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 20;
}