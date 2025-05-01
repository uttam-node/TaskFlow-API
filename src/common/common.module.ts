// src/common/common.module.ts
import { Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';

@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CommonModule {}
