// src/common/common.module.ts
import { Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  providers: [
    CacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (cfg: ConfigService) => {
        return new Redis({
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get('REDIS_PORT', 6379),
        });
      },
      inject: [ConfigService],
    },
    RateLimitGuard,
  ],
  exports: [CacheService, 'REDIS_CLIENT', RateLimitGuard],
})
export class CommonModule {}
