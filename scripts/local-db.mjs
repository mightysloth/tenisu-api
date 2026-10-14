import dynalite from 'dynalite';
import { once } from 'node:events';
import { mkdirSync } from 'node:fs';
import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import fixture from '../src/players/infrastructure/headtohead.json' with { type: 'json' };

mkdirSync('./data/dynamodb', { recursive: true });
const server = dynalite({ path: './data/dynamodb', createTableMs: 0 });
server.listen(8000, '127.0.0.1');
await once(server, 'listening');
const tableName = process.env.PLAYERS_TABLE ?? 'tenisu-local';
const client = new DynamoDBClient({
  endpoint: 'http://127.0.0.1:8000',
  region: process.env.AWS_REGION ?? 'eu-west-3',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});
try {
  await client.send(
    new CreateTableCommand({
      TableName: tableName,
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
} catch (error) {
  if (!(error instanceof ResourceInUseException)) throw error;
}
const documentClient = DynamoDBDocumentClient.from(client);
for (const player of fixture.players) {
  try {
    await documentClient.send(
      new PutCommand({
        TableName: tableName,
        Item: { pk: 'PLAYERS', id: player.id, player },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
  }
}
client.destroy();
console.log(
  `Local DynamoDB ready on http://127.0.0.1:8000 (${tableName}); data persisted in ./data/dynamodb`,
);
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
