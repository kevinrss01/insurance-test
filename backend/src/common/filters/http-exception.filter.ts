import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException, AppErrorCode } from '../errors/app-exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message, details } = this.resolveErrorDetails(exception, status);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        details,
      },
    });
  }

  private resolveErrorDetails(
    exception: unknown,
    status: number,
  ): { code: AppErrorCode; message: string; details: unknown } {
    if (exception instanceof AppException) {
      const responseBody = exception.getResponse();
      const message =
        typeof responseBody === 'string'
          ? responseBody
          : (responseBody as { message?: string }).message ?? exception.message;
      return {
        code: exception.errorCode,
        message,
        details: exception.details ?? null,
      };
    }

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();
      const message = this.extractMessage(responseBody, exception.message);
      const details =
        typeof responseBody === 'object' && responseBody !== null
          ? (responseBody as { details?: unknown }).details ?? null
          : null;

      return {
        code: this.mapStatusToCode(status),
        message,
        details,
      };
    }

    return {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: null,
    };
  }

  private extractMessage(responseBody: unknown, fallback: string): string {
    if (typeof responseBody === 'string') return responseBody;
    if (typeof responseBody === 'object' && responseBody !== null) {
      const body = responseBody as { message?: string | string[] };
      if (Array.isArray(body.message)) return body.message.join('; ');
      if (typeof body.message === 'string') return body.message;
    }
    return fallback;
  }

  private mapStatusToCode(status: number): AppErrorCode {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.BAD_GATEWAY:
        return 'AI_ERROR';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR';
    }
  }
}
