import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DynamoPlayerRepository } from '../players/infrastructure/dynamo-player.repository.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly repository: DynamoPlayerRepository) {}

  @Get()
  @ApiOperation({ summary: 'Check application and storage readiness' })
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.repository.healthCheck();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Player storage is unavailable');
    }
  }
}
