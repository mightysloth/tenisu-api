import { createHash, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class WriteApiKeyGuard implements CanActivate {
  private readonly expectedHash: Buffer;

  constructor(config: ConfigService) {
    this.expectedHash = createHash('sha256')
      .update(config.getOrThrow<string>('app.writeApiKey'))
      .digest();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header('x-api-key');
    if (
      !apiKey ||
      !timingSafeEqual(
        this.expectedHash,
        createHash('sha256').update(apiKey).digest(),
      )
    ) {
      throw new UnauthorizedException('A valid X-API-Key is required');
    }
    return true;
  }
}
