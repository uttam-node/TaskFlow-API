import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

export const RATE_LIMIT_METADATA = 'rate_limit_options';
export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

/**
 * Apply to methods only; stores options on the method function.
 */
export const RateLimit = (opts: RateLimitOptions): MethodDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ): TypedPropertyDescriptor<any> | void => {
    Reflect.defineMetadata(
      RATE_LIMIT_METADATA,
      opts,
      descriptor.value!, // non-null, since this is a MethodDecorator
    );
    return descriptor;
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const opts = this.reflector.get<RateLimitOptions>(RATE_LIMIT_METADATA, handler) || {
      limit: 100,
      windowMs: 60_000,
    };

    const req = context.switchToHttp().getRequest();
    const route = req.route?.path || req.url;
    const ip = this.hashIp(req.ip);
    const key = `ratelimit:${route}:${ip}`;
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    // remove expired entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // count remaining
    const count = await this.redis.zcard(key);
    if (count >= opts.limit) {
      this.logger.warn(`Rate limit exceeded for ${key}: ${count}/${opts.limit}`);
      throw new HttpException(
        'Too many requests; please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // record this hit
    await this.redis.zadd(key, now, now.toString());
    // ensure the key expires after the window
    await this.redis.pexpire(key, opts.windowMs);

    return true;
  }

  private hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }
}
