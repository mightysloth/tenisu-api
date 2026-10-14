import { once } from 'node:events';
import dynalite from 'dynalite';
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createDynamoClient } from '../src/players/infrastructure/dynamo-client.js';
import { DynamoPlayerRepository } from '../src/players/infrastructure/dynamo-player.repository.js';
import { seedPlayers } from '../src/players/infrastructure/seed.js';
import { loadConfig } from '../src/config.js';

export async function startTestDatabase() {
  const server = dynalite({ createTableMs: 0 });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing local database address');
  const config = loadConfig({
    WRITE_API_KEY: 'test-write-api-key-with-at-least-32-characters',
    DYNAMODB_ENDPOINT: `http://127.0.0.1:${address.port}`,
  });
  const client = new DynamoDBClient({
    endpoint: config.endpoint!,
    region: config.region,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });
  await client.send(
    new CreateTableCommand({
      TableName: config.tableName,
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'id', AttributeType: 'N' },
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'id', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    }),
  );
  client.destroy();
  const repository = new DynamoPlayerRepository(
    createDynamoClient(config),
    config.tableName,
  );
  await Promise.all(seedPlayers.map((player) => repository.create(player)));
  return {
    config,
    repository,
    close: async () => {
      repository.onModuleDestroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
