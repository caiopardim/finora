'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Inicializa o Sentry no browser (inerte até definir NEXT_PUBLIC_SENTRY_DSN).
// Captura erros client-side em produção sem depender do cliente relatar.
export default function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 0,
      replaysSessionSampleRate: 0,
    });
  }, []);
  return null;
}
