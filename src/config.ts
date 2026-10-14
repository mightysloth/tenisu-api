export interface AppConfig {
  port: number;
  tableName: string;
  writeApiKey: string;
  region: string;
  endpoint?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const writeApiKey = env.WRITE_API_KEY ?? '';
  if (writeApiKey.length < 32 || writeApiKey.trim() !== writeApiKey) {
    throw new Error(
      'WRITE_API_KEY must contain at least 32 characters with no surrounding whitespace',
    );
  }
  const production = env.NODE_ENV === 'production';
  if (production && writeApiKey.startsWith('local-development-')) {
    throw new Error('Replace the development WRITE_API_KEY before deploying');
  }
  const endpoint = production
    ? undefined
    : (env.DYNAMODB_ENDPOINT ?? 'http://127.0.0.1:8000');
  if (
    endpoint &&
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL(endpoint).hostname)
  ) {
    throw new Error('Development DynamoDB must use a loopback endpoint');
  }
  if (production && (!env.PLAYERS_TABLE || env.DYNAMODB_ENDPOINT)) {
    throw new Error(
      'Production requires PLAYERS_TABLE and no local DynamoDB endpoint',
    );
  }
  return {
    port,
    tableName: env.PLAYERS_TABLE ?? 'tenisu-local',
    writeApiKey,
    region: env.AWS_REGION ?? 'eu-west-3',
    ...(endpoint ? { endpoint } : {}),
  };
}
