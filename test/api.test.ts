import { deepStrictEqual, equal, match } from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from '../src/bootstrap.js';
import { seedPlayers } from '../src/players/infrastructure/seed.js';
import type { Player } from '../src/players/domain/player.js';
import { DynamoPlayerRepository } from '../src/players/infrastructure/dynamo-player.repository.js';
import { startTestDatabase } from './local-database.js';

const apiKey = 'test-write-api-key-with-at-least-32-characters';
let app: NestExpressApplication;
const newPlayer = { ...seedPlayers[0]!, id: 120 };
let database: Awaited<ReturnType<typeof startTestDatabase>>;

before(async () => {
  database = await startTestDatabase();
  app = await createApp(database.config, true);
});

after(async () => {
  await app?.close();
  await database?.close();
});

test('GET /players returns the expected ranking and original IDs', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/v1/players')
    .expect(200);
  deepStrictEqual(
    (response.body.players as Player[]).map((player) => player.id),
    [17, 52, 102, 65, 95],
  );
  equal(response.headers['x-content-type-options'], 'nosniff');
  equal(response.headers['x-powered-by'], undefined);
});

test('GET /players/:id returns the complete player', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/v1/players/52')
    .expect(200);
  deepStrictEqual(response.body, seedPlayers[0]);
});

test('missing players return 404 and malformed IDs return 400', async () => {
  for (const id of ['9999', '-1']) {
    await request(app.getHttpServer()).get(`/api/v1/players/${id}`).expect(404);
  }
  for (const id of ['abc', '1.2']) {
    await request(app.getHttpServer()).get(`/api/v1/players/${id}`).expect(400);
  }
});

test('GET /statistics exposes the three requested calculations', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/v1/statistics')
    .expect(200);
  deepStrictEqual(response.body, {
    bestCountry: { code: 'SRB', wins: 5, matches: 5, ratio: 1 },
    averageBmi: 23.36,
    medianHeight: 185,
    playerCount: 5,
  });
});

test('POST /players requires the write API key', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/players')
    .send(newPlayer)
    .expect(401);
  await request(app.getHttpServer())
    .post('/api/v1/players')
    .set('X-API-Key', 'wrong-key')
    .send(newPlayer)
    .expect(401);
});

test('POST /players validates nested fields and rejects unknown fields', async () => {
  const invalidBodies = [
    {},
    { ...newPlayer, id: 0 },
    { ...newPlayer, id: Number.MAX_SAFE_INTEGER + 1 },
    { ...newPlayer, admin: true },
    { ...newPlayer, firstname: '   ' },
    { ...newPlayer, sex: 'X' },
    { ...newPlayer, picture: 'javascript:alert(1)' },
    { ...newPlayer, country: { ...newPlayer.country, code: 'usa' } },
    { ...newPlayer, country: null },
    { ...newPlayer, country: [{ ...newPlayer.country }] },
    { ...newPlayer, data: { ...newPlayer.data, height: 0 } },
    { ...newPlayer, data: { ...newPlayer.data, weight: -1 } },
    { ...newPlayer, data: { ...newPlayer.data, rank: '1' } },
    { ...newPlayer, data: { ...newPlayer.data, last: [2] } },
    { ...newPlayer, data: { ...newPlayer.data, last: ['1'] } },
    { ...newPlayer, data: { ...newPlayer.data, last: Array(101).fill(1) } },
    { ...newPlayer, data: { ...newPlayer.data, admin: true } },
  ];
  for (const body of invalidBodies) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/players')
      .set('X-API-Key', apiKey)
      .send(body)
      .expect(400);
    equal(response.body.statusCode, 400);
    equal(Array.isArray(response.body.message), true);
  }
});

test('POST /players rejects malformed JSON', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/players')
    .set('X-API-Key', apiKey)
    .set('Content-Type', 'application/json')
    .send('{broken')
    .expect(400);
});

test('POST /players rejects an oversized body', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/players')
    .set('X-API-Key', apiKey)
    .send({ ...newPlayer, firstname: 'a'.repeat(17000) })
    .expect(413);
});

test('POST /players reports an existing ID as a conflict', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/v1/players')
    .set('X-API-Key', apiKey)
    .send(seedPlayers[0])
    .expect(409);
  equal(response.body.statusCode, 409);
  const existing = await request(app.getHttpServer())
    .get('/api/v1/players/52')
    .expect(200);
  deepStrictEqual(existing.body, seedPlayers[0]);
});

test('POST /players creates, persists, trims names, and updates statistics', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/v1/players')
    .set('X-API-Key', apiKey)
    .send({
      ...newPlayer,
      firstname: '  Roger  ',
      data: { ...newPlayer.data, rank: 1, points: 10000, last: [] },
    })
    .expect(201);
  equal(response.body.id, 120);
  equal(response.body.firstname, 'Roger');
  equal(response.headers.location, '/api/v1/players/120');

  const retrieved = await request(app.getHttpServer())
    .get(response.headers.location)
    .expect(200);
  deepStrictEqual(retrieved.body, response.body);
  const listed = await request(app.getHttpServer())
    .get('/api/v1/players')
    .expect(200);
  equal(listed.body.players[0].id, 120);
  const statistics = await request(app.getHttpServer())
    .get('/api/v1/statistics')
    .expect(200);
  equal(statistics.body.playerCount, 6);
});

test('GET /health checks the repository', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/v1/health')
    .expect(200);
  deepStrictEqual(response.body, { status: 'ok' });
});

test('Swagger and OpenAPI document the public API and POST authorization', async () => {
  await request(app.getHttpServer()).get('/docs/').expect(200);
  const response = await request(app.getHttpServer())
    .get('/openapi.json')
    .expect(200);
  const paths = response.body.paths;
  equal(paths['/api/v1/players'].post.responses['201'].description, '');
  deepStrictEqual(paths['/api/v1/players'].post.security, [
    { 'write-api-key': [] },
  ]);
  equal(
    paths['/api/v1/statistics'].get.responses['200'].content['application/json']
      .schema.$ref,
    '#/components/schemas/StatisticsDto',
  );
});

test('database failures stay private and readiness reports 503', async () => {
  const repository = app.get(DynamoPlayerRepository);
  const originalFindAll = repository.findAll;
  const originalHealth = repository.healthCheck;
  try {
    repository.findAll = async () => {
      throw new Error('secret database connection string');
    };
    repository.healthCheck = async () => {
      throw new Error('secret database connection string');
    };
    const failed = await request(app.getHttpServer())
      .get('/api/v1/players')
      .expect(500);
    equal(failed.body.message, 'Internal server error');
    const health = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);
    match(health.body.message, /unavailable/);
  } finally {
    repository.findAll = originalFindAll;
    repository.healthCheck = originalHealth;
  }
});
