// src/common/services/cache.service.ts

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly prefix: string;
  private readonly defaultTtl: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.prefix = this.configService.get<string>('CACHE_PREFIX', 'app');
    this.defaultTtl = this.configService.get<number>('CACHE_TTL', 300);
  }

  /** Namespace keys to avoid collisions */
  private namespaced(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /** Set a value with optional TTL (in seconds) */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const nsKey = this.namespaced(key);
    const ttl = ttlSeconds ?? this.defaultTtl;
    const payload = JSON.stringify(value);

    try {
      // cacheManager.set(key, value, ttl) expects ttl as a number
      await this.cacheManager.set(nsKey, payload, ttl);
      this.logger.debug(`Cache SET ${nsKey} (ttl=${ttl}s)`);
    } catch (err: any) {
      this.logger.error(`Cache SET error for ${nsKey}`, err.stack);
    }
  }

  /** Get a deserialized value or null */
  async get<T>(key: string): Promise<T | null> {
    const nsKey = this.namespaced(key);

    try {
      const raw = await this.cacheManager.get<string>(nsKey);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch (err: any) {
      this.logger.error(`Cache GET error for ${nsKey}`, err.stack);
      return null;
    }
  }

  /** Delete a key */
  async del(key: string): Promise<boolean> {
    const nsKey = this.namespaced(key);

    try {
      await this.cacheManager.del(nsKey);
      this.logger.debug(`Cache DEL ${nsKey}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Cache DEL error for ${nsKey}`, err.stack);
      return false;
    }
  }

  /** Check existence without retrieving the full value */
  async has(key: string): Promise<boolean> {
    const nsKey = this.namespaced(key);

    try {
      const raw = await this.cacheManager.get<string>(nsKey);
      return raw != null;
    } catch (err: any) {
      this.logger.error(`Cache HAS error for ${nsKey}`, err.stack);
      return false;
    }
  }

  /** Clear the entire cache (attempts reset on manager or store) */
  async clear(): Promise<void> {
    try {
      if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
        this.logger.debug(`Cache RESET via manager`);
      } else if (
        this.cacheManager.stores &&
        typeof (this.cacheManager.stores as any).reset === 'function'
      ) {
        await (this.cacheManager.stores as any).reset();
        this.logger.debug(`Cache RESET via store`);
      } else {
        this.logger.warn(`Cache RESET not supported by this store`);
      }
    } catch (err: any) {
      this.logger.error(`Cache RESET error`, err.stack);
    }
  }

  /** Bulk set multiple entries */
  async mset<T>(entries: { key: string; value: T; ttlSeconds?: number }[]): Promise<void> {
    await Promise.all(entries.map(e => this.set(e.key, e.value, e.ttlSeconds)));
  }

  /** Bulk get multiple entries */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return Promise.all(keys.map(k => this.get<T>(k)));
  }
}
