import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError, timer, from, lastValueFrom } from 'rxjs';
import { retryWhen, mergeMap } from 'rxjs/operators';

@Injectable()
export class RetryInterceptor implements NestInterceptor {
  private readonly maxRetry = 3;
  private readonly delayMs = 1000;
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: any, i: number) => {
            const attempt = i + 1;
            const status = error instanceof HttpException ? error.getStatus() : 500;
            if (attempt <= this.maxRetry && status >= 500) {
              return timer(this.delayMs);
            }
            return throwError(() => error);
          }),
        ),
      ),
    );
  }
}
