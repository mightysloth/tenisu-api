import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config.js';
import { WriteApiKeyGuard } from '../common/write-api-key.guard.js';
import { PlayersController } from './http/players.controller.js';
import { PlayersService } from './players.service.js';
import { createDynamoClient } from './infrastructure/dynamo-client.js';
import { DynamoPlayerRepository } from './infrastructure/dynamo-player.repository.js';

@Module({
  controllers: [PlayersController],
  providers: [
    PlayersService,
    WriteApiKeyGuard,
    {
      provide: DynamoPlayerRepository,
      inject: [ConfigService],
      useFactory: (configuration: ConfigService) => {
        const config = configuration.getOrThrow<AppConfig>('app');
        return new DynamoPlayerRepository(
          createDynamoClient(config),
          config.tableName,
        );
      },
    },
  ],
  exports: [DynamoPlayerRepository],
})
export class PlayersModule {}
