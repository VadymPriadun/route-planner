import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PoiService } from './poi.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';

@ApiTags('pois')
@Controller('pois')
export class PoiController {
    constructor(private readonly poi: PoiService) {}

    @Get('nearby')
    nearby(@Query() query: NearbyQueryDto) {
        return this.poi.findNearby(query);
    }

    @Get(':id')
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.poi.findOne(id);
    }
}