import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorDto } from '../../common/api-error.dto.js';
import { WriteApiKeyGuard } from '../../common/write-api-key.guard.js';
import { PlayersService } from '../players.service.js';
import { CreatePlayerDto, PlayerDto, PlayersDto } from './player.dto.js';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get()
  @ApiOperation({
    summary:
      'List players by rank ascending, then points descending and ID ascending',
  })
  @ApiOkResponse({ type: PlayersDto })
  findAll(): Promise<PlayersDto> {
    return this.players.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a player by ID' })
  @ApiOkResponse({ type: PlayerDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  findById(@Param('id', ParseIntPipe) id: number): Promise<PlayerDto> {
    return this.players.findById(id);
  }

  @Post()
  @UseGuards(WriteApiKeyGuard)
  @ApiOperation({ summary: 'Create a player with a unique ID' })
  @ApiSecurity('write-api-key')
  @ApiCreatedResponse({
    type: PlayerDto,
    headers: {
      Location: {
        description: 'Created player URL',
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  async create(
    @Body() input: CreatePlayerDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PlayerDto> {
    const player = await this.players.create({
      id: input.id,
      firstname: input.firstname,
      lastname: input.lastname,
      shortname: input.shortname,
      sex: input.sex,
      picture: input.picture,
      country: { code: input.country.code, picture: input.country.picture },
      data: { ...input.data, last: [...input.data.last] },
    });
    response.setHeader('Location', `/api/v1/players/${player.id}`);
    return player;
  }
}
