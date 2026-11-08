import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AiService, ParseResult } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export class ParseRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  text: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('parse')
  parse(@Body() dto: ParseRequestDto): Promise<ParseResult> {
    return this.ai.parse(dto.text);
  }
}
