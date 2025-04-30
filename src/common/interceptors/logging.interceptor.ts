import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Interceptor for logging incoming requests and outgoing responses.
 * - Logs method, URL, IP, user ID (if available)
 * - Measures and logs response time
 * - Sanitizes request body to avoid sensitive data exposure
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { method, originalUrl, ip } = req;
    const userId = (req.user as any)?.id;
    const startTime = Date.now();

    // Clone and sanitize body
    const body = { ...(req.body as Record<string, any>) };
    ['password', 'pwd', 'authorization', 'token'].forEach(field => delete body[field]);

    this.logger.log(
      `Request: ${method} ${originalUrl} from ${ip}` +
        `${userId ? ` user=${userId}` : ''}` +
        ` body=${JSON.stringify(body)}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - startTime;
          this.logger.log(
            `Response: ${method} ${originalUrl} ${res.statusCode} in ${elapsed}ms` +
              `${userId ? ` user=${userId}` : ''}`,
          );
        },
        error: (err: unknown) => {
          const elapsed = Date.now() - startTime;
          const message = err instanceof Error ? err.message : JSON.stringify(err);
          this.logger.error(
            `Error: ${method} ${originalUrl} ${res.statusCode || '-'} ` +
              `in ${elapsed}ms - ${message}` +
              `${userId ? ` user=${userId}` : ''}`,
          );
        },
      }),
    );
  }
}
