import { deepStrictEqual, equal } from 'node:assert/strict';
import { test } from 'node:test';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { handler } from '../src/lambda.js';
import { startTestDatabase } from './local-database.js';

test('the Lambda handler serves API Gateway v2 requests and reuses its initialization', async () => {
  const database = await startTestDatabase();
  process.env.NODE_ENV = 'test';
  process.env.WRITE_API_KEY = database.config.writeApiKey;
  process.env.DYNAMODB_ENDPOINT = database.config.endpoint;
  process.env.PLAYERS_TABLE = database.config.tableName;
  const event: APIGatewayProxyEventV2 = {
    version: '2.0',
    routeKey: 'ANY /{proxy+}',
    rawPath: '/api/v1/statistics',
    rawQueryString: '',
    headers: { host: 'example.execute-api.eu-west-3.amazonaws.com' },
    requestContext: {
      accountId: '000000000000',
      apiId: 'example',
      domainName: 'example.execute-api.eu-west-3.amazonaws.com',
      domainPrefix: 'example',
      http: {
        method: 'GET',
        path: '/api/v1/statistics',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'test',
      routeKey: 'ANY /{proxy+}',
      stage: '$default',
      time: '',
      timeEpoch: 0,
    },
    isBase64Encoded: false,
  };
  try {
    const responses = await Promise.all([
      handler(event, {} as Context, () => {}),
      handler(event, {} as Context, () => {}),
    ]);
    for (const response of responses) {
      const result = response as APIGatewayProxyResult;
      equal(result.statusCode, 200);
      deepStrictEqual(JSON.parse(result.body).bestCountry, {
        code: 'SRB',
        wins: 5,
        matches: 5,
        ratio: 1,
      });
    }
  } finally {
    await database.close();
  }
});
