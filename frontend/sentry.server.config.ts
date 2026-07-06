import * as Sentry from '@sentry/nextjs';

// Monitoramento de erros no servidor (route handlers / SSR) — inerte sem DSN.
if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
