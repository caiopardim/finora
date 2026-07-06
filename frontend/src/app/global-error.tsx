'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Captura erros de renderização do React (App Router) no Sentry.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0, background: '#0f172a', color: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Algo deu errado</h1>
          <p style={{ color: '#94a3b8', margin: '0 0 20px', fontSize: 14 }}>Já registramos o erro. Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
