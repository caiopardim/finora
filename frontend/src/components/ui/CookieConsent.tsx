'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'finora-cookie-consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch { /* ignore */ }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 9999,
      maxWidth: 720, margin: '0 auto',
      background: '#0f172a', color: '#f1f5f9',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
      padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>🍪</span>
      <p style={{ margin: 0, fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.6, flex: 1, minWidth: 220 }}>
        Usamos apenas <strong style={{ color: '#f1f5f9' }}>cookies essenciais</strong> para manter você
        conectado e lembrar suas preferências. Não usamos rastreamento nem publicidade de terceiros.{' '}
        <a href="/privacidade" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 600 }}>Saiba mais</a>.
      </p>
      <button
        onClick={accept}
        style={{
          padding: '10px 22px', borderRadius: 9, border: 'none',
          background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}
      >
        Entendi
      </button>
    </div>
  );
}
