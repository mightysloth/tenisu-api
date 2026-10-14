import { ApiProperty } from '@nestjs/swagger';
import type { CountryWinRatio, Statistics } from './calculate-statistics.js';

export class CountryWinRatioDto implements CountryWinRatio {
  @ApiProperty({ example: 'SRB' })
  code!: string;

  @ApiProperty({ example: 5 })
  wins!: number;

  @ApiProperty({ example: 5 })
  matches!: number;

  @ApiProperty({ example: 1, minimum: 0, maximum: 1 })
  ratio!: number;
}

export class StatisticsDto implements Statistics {
  @ApiProperty({ type: CountryWinRatioDto, nullable: true })
  bestCountry!: CountryWinRatioDto | null;

  @ApiProperty({
    type: Number,
    example: 23.36,
    nullable: true,
    description: 'Mean of individual BMIs, rounded to two decimal places',
  })
  averageBmi!: number | null;

  @ApiProperty({
    type: Number,
    example: 185,
    nullable: true,
    description: 'Median height in centimetres',
  })
  medianHeight!: number | null;

  @ApiProperty({ example: 5 })
  playerCount!: number;
}
