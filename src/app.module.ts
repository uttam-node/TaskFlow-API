import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-redis-store';

import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AuthModule } from './modules/auth/auth.module';
import { TaskProcessorModule } from './queues/task-processor/task-processor.module';
import { ScheduledTasksModule } from './queues/scheduled-tasks/scheduled-tasks.module';
import { MetricsModule } from './metrics/metrics.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { RetryInterceptor } from '@common/interceptors/retry.interceptor';
import { CircuitBreakerInterceptor } from '@common/interceptors/circuit-breaker.interceptor';
const throttleOpts = {
  ttl: Number(process.env.THROTTLE_TTL) || 60,
  limit: Number(process.env.THROTTLE_LIMIT) || 10,
} as any;
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({ isGlobal: true }),

    // Database (Postgres)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('DB_HOST'),
        port: cfg.get<number>('DB_PORT'),
        username: cfg.get<string>('DB_USERNAME'),
        password: cfg.get<string>('DB_PASSWORD'),
        database: cfg.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: cfg.get<string>('NODE_ENV') === 'development',
        logging: cfg.get<string>('NODE_ENV') === 'development',
      }),
    }),
    // Distributed Cache with Redis
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        store: redisStore,
        socket: {
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get('REDIS_PORT', 6379),
        },
        ttl: cfg.get('CACHE_TTL', 300),
      }),
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // BullMQ (Redis) queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get<string>('REDIS_HOST'),
          port: cfg.get<number>('REDIS_PORT'),
        },
      }),
    }),

    // Rate limiting (synchronous, using env vars)
    ThrottlerModule.forRoot(throttleOpts),

    // Feature modules
    UsersModule,
    TasksModule,
    AuthModule,

    // Queue processing modules
    TaskProcessorModule,
    ScheduledTasksModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    { provide: APP_INTERCEPTOR, useClass: RetryInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CircuitBreakerInterceptor },
  ],
})
export class AppModule {}
{
}
