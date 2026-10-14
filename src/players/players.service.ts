import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  comparePlayers,
  PlayerAlreadyExistsError,
  type Player,
} from './domain/player.js';
import { DynamoPlayerRepository } from './infrastructure/dynamo-player.repository.js';

@Injectable()
export class PlayersService {
  constructor(private readonly repository: DynamoPlayerRepository) {}

  async findAll(): Promise<{ players: Player[] }> {
    return { players: (await this.repository.findAll()).sort(comparePlayers) };
  }

  async findById(id: number): Promise<Player> {
    const player = await this.repository.findById(id);
    if (!player) throw new NotFoundException(`Player ${id} was not found`);
    return player;
  }

  async create(player: Player): Promise<Player> {
    try {
      return await this.repository.create(player);
    } catch (error) {
      if (error instanceof PlayerAlreadyExistsError)
        throw new ConflictException(error.message);
      throw error;
    }
  }
}
