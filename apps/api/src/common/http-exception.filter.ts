import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { CityNotFoundError, ProviderUnavailableError } from './domain-errors';

interface ErrorResponse {
  status: number;
  body: Record<string, unknown>;
}

function toErrorResponse(exception: unknown): ErrorResponse {
  if (exception instanceof CityNotFoundError) {
    return {
      status: HttpStatus.NOT_FOUND,
      body: { message: 'Cidade não encontrada. Tente o formato "Cidade, UF".' },
    };
  }
  if (exception instanceof ProviderUnavailableError) {
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: { message: 'A fonte de dados está indisponível no momento. Tente novamente em instantes.' },
    };
  }
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    const body = typeof response === 'string' ? { message: response } : (response as Record<string, unknown>);
    return { status: exception.getStatus(), body };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: { message: 'Erro interno.' } };
}

/** Maps domain errors to predictable HTTP responses without leaking internals (no stack traces). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = toErrorResponse(exception);
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logFailure(status, exception);
    }
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private logFailure(status: number, exception: unknown): void {
    const error = exception instanceof Error ? exception : undefined;
    this.logger.error(
      JSON.stringify({ event: 'request_failed', status, error: error?.name ?? 'Unknown', detail: error?.message }),
    );
  }
}
