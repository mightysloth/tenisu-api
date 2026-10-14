import { equal, throws } from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config.js';

const key = 'test-write-api-key-with-at-least-32-characters';

test('requires a write key and validates the port', () => {
  throws(() => loadConfig({}), /WRITE_API_KEY/);
  throws(() => loadConfig({ WRITE_API_KEY: 'short' }), /WRITE_API_KEY/);
  throws(() => loadConfig({ WRITE_API_KEY: key, PORT: '0' }), /PORT/);
});

test('local development uses only a loopback endpoint', () => {
  equal(loadConfig({ WRITE_API_KEY: key }).endpoint, 'http://127.0.0.1:8000');
  throws(
    () =>
      loadConfig({
        WRITE_API_KEY: key,
        DYNAMODB_ENDPOINT: 'https://dynamodb.eu-west-3.amazonaws.com',
      }),
    /loopback/,
  );
});

test('production requires a real write key, a table name and no emulator', () => {
  throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        WRITE_API_KEY: 'local-development-key-change-before-deploy',
      }),
    /development/,
  );
  throws(
    () => loadConfig({ NODE_ENV: 'production', WRITE_API_KEY: key }),
    /PLAYERS_TABLE/,
  );
  throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        WRITE_API_KEY: key,
        PLAYERS_TABLE: 'players',
        DYNAMODB_ENDPOINT: 'http://localhost:8000',
      }),
    /Production/,
  );
  equal(
    loadConfig({
      NODE_ENV: 'production',
      WRITE_API_KEY: key,
      PLAYERS_TABLE: 'players',
    }).endpoint,
    undefined,
  );
});
