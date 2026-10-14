import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { Player, PlayerCountry, PlayerData } from '../domain/player.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CountryDto implements PlayerCountry {
  @ApiProperty({ example: 'SRB', pattern: '^[A-Z]{3}$' })
  @Transform(trim)
  @Matches(/^[A-Z]{3}$/)
  code!: string;

  @ApiProperty({ example: 'https://tenisu.latelier.co/resources/Serbie.png' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  picture!: string;
}

export class PlayerDataDto implements PlayerData {
  @ApiProperty({ example: 2, minimum: 1, maximum: Number.MAX_SAFE_INTEGER })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  rank!: number;

  @ApiProperty({ example: 2542, minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  points!: number;

  @ApiProperty({
    example: 80000,
    description: 'Weight in grams',
    minimum: 1,
    maximum: 1000000,
  })
  @IsInt()
  @Min(1)
  @Max(1000000)
  weight!: number;

  @ApiProperty({
    example: 188,
    description: 'Height in centimetres',
    minimum: 1,
    maximum: 300,
  })
  @IsInt()
  @Min(1)
  @Max(300)
  height!: number;

  @ApiProperty({ example: 31, minimum: 1, maximum: 120 })
  @IsInt()
  @Min(1)
  @Max(120)
  age!: number;

  @ApiProperty({
    example: [1, 1, 1, 1, 1],
    description:
      'Available match results: 1 = win, 0 = loss. Empty when no results are known.',
    type: 'array',
    items: { type: 'integer', enum: [0, 1] },
    maxItems: 100,
  })
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @IsIn([0, 1], { each: true })
  last!: number[];
}

export class CreatePlayerDto implements Player {
  @ApiProperty({
    example: 120,
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    description: 'Unique player ID, supplied by the client',
  })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  id!: number;

  @ApiProperty({ example: 'Novak', minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstname!: string;

  @ApiProperty({ example: 'Djokovic', minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastname!: string;

  @ApiProperty({ example: 'N.DJO', minLength: 1, maxLength: 20 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  shortname!: string;

  @ApiProperty({ enum: ['M', 'F'], example: 'M' })
  @IsIn(['M', 'F'])
  sex!: 'M' | 'F';

  @ApiProperty({ type: CountryDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CountryDto)
  country!: CountryDto;

  @ApiProperty({ example: 'https://tenisu.latelier.co/resources/Djokovic.png' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  picture!: string;

  @ApiProperty({ type: PlayerDataDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PlayerDataDto)
  data!: PlayerDataDto;
}

export class PlayerDto extends CreatePlayerDto {}

export class PlayersDto {
  @ApiProperty({ type: [PlayerDto] })
  players!: PlayerDto[];
}
