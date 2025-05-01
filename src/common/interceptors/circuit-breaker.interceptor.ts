import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';

// Use require for untyped opossum module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const opossum: any = require('opossum');

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private breaker: any;

  constructor() {
    this.breaker = new opossum(
      (fn: Function, context: any, args: any[]) => fn.apply(context, args),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
        timeout: 1000,
      },
    );
    this.breaker.fallback(() => {
      throw new HttpException('Service unavailable', 503);
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = () => next.handle().toPromise();
    return from(this.breaker.fire(handler, this, []).catch((err: any) => Promise.reject(err)));
  }
}
