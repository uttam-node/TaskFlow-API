import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private httpRequestDuration: client.Histogram<string>;

  onModuleInit() {
    // Collect default metrics (CPU, memory) every 10s
    client.collectDefaultMetrics();

    // Create a histogram to track request durations
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });
  }

  recordRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestDuration.labels(method, route, status.toString()).observe(duration);
  }

  getMetrics(): Promise<string> {
    return client.register.metrics();
  }
}
