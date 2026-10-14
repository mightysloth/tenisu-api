import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DynamoPlayerRepository } from '../players/infrastructure/dynamo-player.repository.js';
import { calculateStatistics } from './calculate-statistics.js';
import { StatisticsDto } from './statistics.dto.js';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly repository: DynamoPlayerRepository) {}

  @Get()
  @ApiOperation({
    summary: 'Get the best country win ratio, average BMI and median height',
  })
  @ApiOkResponse({ type: StatisticsDto })
  async findAll(): Promise<StatisticsDto> {
    return calculateStatistics(await this.repository.findAll());
  }
}
