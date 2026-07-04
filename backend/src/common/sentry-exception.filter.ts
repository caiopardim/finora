import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

// Captura exceções de servidor (5xx / não tratadas) no Sentry e mantém
// o comportamento padrão de resposta do Nest.
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    // Não reporta erros esperados do cliente (4xx), só falhas de servidor
    if (process.env.SENTRY_DSN && status >= 500) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
