import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config.js';

export async function createApp(
  config: AppConfig,
  silent = false,
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(config),
    {
      ...(silent ? { logger: false as const } : {}),
      abortOnError: false,
      bodyParser: false,
    },
  );
  const upgradeInsecureRequests = config.endpoint ? null : [];
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { upgradeInsecureRequests } },
    }),
  );
  app.use(
    '/docs',
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: ["'self'", "'unsafe-inline'"],
          upgradeInsecureRequests,
        },
      },
    }),
  );
  app.useBodyParser('json', { limit: '16kb' });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
    }),
  );

  const documentConfig = new DocumentBuilder()
    .setTitle('Tenisu API')
    .setDescription(
      'L’Atelier tennis players API. Ranks are ascending; weights are grams; heights are centimetres. Match statistics use the available results in data.last.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      'write-api-key',
    )
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, documentConfig),
    {
      jsonDocumentUrl: '/openapi.json',
      swaggerOptions: { persistAuthorization: false },
    },
  );
  await app.init();
  return app;
}
