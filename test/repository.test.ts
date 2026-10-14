import { deepStrictEqual, equal, rejects } from 'node:assert/strict';
import { mock, test } from 'node:test';
import type { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PlayerAlreadyExistsError } from '../src/players/domain/player.js';
import { PlayersService } from '../src/players/players.service.js';
import { seedPlayers } from '../src/players/infrastructure/seed.js';
import { startTestDatabase } from './local-database.js';
import { createDynamoClient } from '../src/players/infrastructure/dynamo-client.js';
import { DynamoPlayerRepository } from '../src/players/infrastructure/dynamo-player.repository.js';
import { loadConfig } from '../src/config.js';

test('reads every query page using the continuation key', async () => {
  const client = createDynamoClient(
    loadConfig({ WRITE_API_KEY: 'test-key-with-at-least-32-characters' }),
  );
  const repository = new DynamoPlayerRepository(client, 'pagination-test');
  const cursor = { pk: 'PLAYERS', id: 52 };
  const pages = [
    { Items: [{ player: seedPlayers[0] }], LastEvaluatedKey: cursor },
    { Items: [{ player: seedPlayers[1] }] },
  ];
  const queries: QueryCommand[] = [];
  const send = mock.method(client, 'send', async (command: QueryCommand) => {
    queries.push(command);
    const page = pages.shift();
    if (!page) throw new Error('Unexpected extra query');
    return page;
  });
  try {
    deepStrictEqual(await repository.findAll(), [
      seedPlayers[0],
      seedPlayers[1],
    ]);
    equal(queries.length, 2);
    deepStrictEqual(queries[1]!.input.ExclusiveStartKey, cursor);
  } finally {
    send.mock.restore();
    repository.onModuleDestroy();
  }
});

test('persists a player and protects an existing ID from being overwritten', async () => {
  const database = await startTestDatabase();
  try {
    const player = { ...seedPlayers[0]!, id: 200 };
    await database.repository.create(player);
    deepStrictEqual(await database.repository.findById(200), player);
    equal(await database.repository.findById(9999), null);
    await rejects(
      database.repository.create({ ...player, firstname: 'Changed' }),
      PlayerAlreadyExistsError,
    );
    deepStrictEqual(await database.repository.findById(200), player);
  } finally {
    await database.close();
  }
});

test('simultaneous creations for the same ID produce one success', async () => {
  const database = await startTestDatabase();
  try {
    const player = { ...seedPlayers[0]!, id: 200 };
    const results = await Promise.allSettled([
      database.repository.create(player),
      database.repository.create(player),
    ]);
    equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    equal((await database.repository.findAll()).length, 6);
  } finally {
    await database.close();
  }
});

test('sorts tied ranks by points descending, then ID ascending', async () => {
  const database = await startTestDatabase();
  try {
    const base = seedPlayers[0]!;
    for (const [id, points] of [
      [201, 10],
      [203, 9999],
      [202, 9999],
    ]) {
      await database.repository.create({
        ...base,
        id: id!,
        data: { ...base.data, rank: 1, points: points! },
      });
    }
    const { players } = await new PlayersService(database.repository).findAll();
    deepStrictEqual(
      players.slice(0, 4).map((player) => player.id),
      [202, 203, 17, 201],
    );
  } finally {
    await database.close();
  }
});
