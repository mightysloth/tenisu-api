import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { AppConfig } from './config.js';
import { HealthController } from './common/health.controller.js';
import { PlayersModule } from './players/players.module.js';
import { StatisticsModule } from './statistics/statistics.module.js';

@Module({
  imports: [PlayersModule, StatisticsModule],
})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [() => ({ app: config })],
        }),
      ],
      controllers: [HealthController],
    };
  }
}
