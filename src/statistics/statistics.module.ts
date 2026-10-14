import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module.js';
import { StatisticsController } from './statistics.controller.js';

@Module({ imports: [PlayersModule], controllers: [StatisticsController] })
export class StatisticsModule {}
