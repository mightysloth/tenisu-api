import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { OnModuleDestroy } from '@nestjs/common';
import { PlayerAlreadyExistsError, type Player } from '../domain/player.js';

const partitionKey = 'PLAYERS';

export class DynamoPlayerRepository implements OnModuleDestroy {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async findAll(): Promise<Player[]> {
    const players: Player[] = [];
    let cursor: Record<string, unknown> | undefined;
    do {
      const page = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: { ':pk': partitionKey },
          ConsistentRead: true,
          ...(cursor ? { ExclusiveStartKey: cursor } : {}),
        }),
      );
      players.push(...(page.Items ?? []).map((item) => item.player as Player));
      cursor = page.LastEvaluatedKey;
    } while (cursor);
    return players;
  }

  async findById(id: number): Promise<Player | null> {
    if (!Number.isSafeInteger(id) || id < 1) return null;
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: partitionKey, id },
        ConsistentRead: true,
      }),
    );
    return (result.Item?.player as Player | undefined) ?? null;
  }

  async create(player: Player): Promise<Player> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: { pk: partitionKey, id: player.id, player },
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );
      return player;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new PlayerAlreadyExistsError(
          `Player ${player.id} already exists`,
        );
      }
      throw error;
    }
  }

  async healthCheck(): Promise<void> {
    await this.findById(17);
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}
