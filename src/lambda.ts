import { configure as serverlessExpress } from '@codegenie/serverless-express';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { createApp } from './bootstrap.js';
import { loadConfig } from './config.js';

type LambdaHandler = (
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<APIGatewayProxyResult>;

let server: LambdaHandler | undefined;
let initialization: Promise<LambdaHandler> | undefined;

async function getServer(): Promise<LambdaHandler> {
  const app = await createApp(loadConfig());
  // v5 returns a Promise, but its typings still require a callback.
  return serverlessExpress<APIGatewayProxyEventV2, APIGatewayProxyResult>({
    app: app.getHttpAdapter().getInstance(),
  }) as unknown as LambdaHandler;
}

export const handler: LambdaHandler = async (event, context) => {
  if (!server) {
    initialization ??= getServer();
    try {
      server = await initialization;
    } catch (error) {
      initialization = undefined;
      throw error;
    }
  }
  return server(event, context);
};
