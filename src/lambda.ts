import { configure as serverlessExpress } from '@codegenie/serverless-express';
import type { APIGatewayProxyEventV2, Handler } from 'aws-lambda';
import { createApp } from './bootstrap.js';
import { loadConfig } from './config.js';

let server: ReturnType<typeof serverlessExpress> | undefined;
let initialization: Promise<ReturnType<typeof serverlessExpress>> | undefined;

async function getServer(): Promise<ReturnType<typeof serverlessExpress>> {
  const app = await createApp(loadConfig());
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export const handler: Handler<APIGatewayProxyEventV2> = async (
  event,
  context,
  callback,
) => {
  if (!server) {
    initialization ??= getServer();
    try {
      server = await initialization;
    } catch (error) {
      initialization = undefined;
      throw error;
    }
  }
  return server(event, context, callback);
};
