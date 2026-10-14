import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await createApp(config);
app.enableShutdownHooks();
await app.listen(config.port, '127.0.0.1');
Logger.log(
  `API listening on port ${config.port}; documentation at /docs`,
  'Bootstrap',
);
