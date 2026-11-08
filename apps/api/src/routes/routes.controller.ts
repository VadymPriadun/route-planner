import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user';

@ApiTags('routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
    constructor(private readonly routes: RoutesService) {}

    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateRouteDto) {
        return this.routes.create(user.id, dto);
    }

    @Get()
    findAll(@CurrentUser() user: AuthUser) {
        return this.routes.findAll(user.id);
    }

    @Get(':id')
    findOne(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
        return this.routes.findOne(user.id, id);
    }

    @Delete(':id')
    @HttpCode(204)
    remove(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
        return this.routes.remove(user.id, id);
    }
}