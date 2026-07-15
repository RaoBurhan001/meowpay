import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Turns every thrown error into one consistent JSON error shape:
 *
 *   { statusCode, message, path, timestamp }
 *
 * Known HttpExceptions (including our domain exceptions) keep their status
 * and message; anything unexpected becomes a 500 with a generic message so we
 * never leak internals to the client. Centralising this here means no
 * controller has to format errors itself (DRY).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // HttpException payloads may be a string or an object with a `message`.
    let message: string | string[] = 'Internal server error';
    if (isHttp) {
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? message);
    }

    if (!isHttp) {
      this.logger.error('Unhandled exception', exception as Error);
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
