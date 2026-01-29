import { HttpException, HttpStatus } from '@nestjs/common';

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'AI_ERROR'
  | 'INTERNAL_ERROR';

export class AppException extends HttpException {
  readonly errorCode: AppErrorCode;
  readonly details: unknown;

  constructor(options: {
    code: AppErrorCode;
    message: string;
    status: HttpStatus;
    details?: unknown;
  }) {
    super(
      {
        message: options.message,
        details: options.details ?? null,
      },
      options.status,
    );
    this.errorCode = options.code;
    this.details = options.details ?? null;
  }
}
