import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter that formats and logs errors consistently.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: any }>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const userId = request.user?.id;

    // Determine log level
    if (status >= 500) {
      this.logger.error(`${method} ${path} ${status} -> ${exception.message}`, exception.stack);
    } else {
      this.logger.warn(`${method} ${path} ${status} -> ${exception.message}`);
    }

    // Extract message and optional details
    let message: string | string[] = exception.message;
    let details: any = undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resObj = exceptionResponse as any;
      if (resObj.message) {
        message = resObj.message;
      }
      if (Array.isArray(resObj['message'])) {
        message = resObj['message'];
      }
      if (resObj['error']) {
        details = resObj.error;
      }
      if (resObj['response'] && resObj['response'].errors) {
        details = resObj.response.errors;
      }
    }

    const formatted = {
      success: false,
      statusCode: status,
      timestamp,
      path,
      method,
      userId,
      message,
      ...(details ? { details } : {}),
    };

    response.status(status).json(formatted);
  }
}
