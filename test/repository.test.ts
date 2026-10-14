import { deepStrictEqual, equal, rejects } from 'node:assert/strict';
import { test } from 'node:test';
import { PlayerAlreadyExistsError } from '../src/players/domain/player.js';
import { PlayersService } from '../src/players/players.service.js';
import { seedPlayers } from '../src/players/infrastructure/seed.js';
import { startTestDatabase } from './local-database.js';

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
