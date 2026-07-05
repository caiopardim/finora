'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }

// Pub/sub simples para disparar toasts de qualquer lugar (sem prop-drilling)
type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let counter = 0;

export function toast(message: string, type: ToastType = 'success') {
  const item: ToastItem = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}
export const toastError = (m: string) => toast(m, 'error');
export const toastInfo = (m: string) => toast(m, 'info');

const STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#0f2a1a', border: '#22c55e55', color: '#4ade80', icon: '✅' },
  error:   { bg: '#2a1010', border: '#ef444455', color: '#fca5a5', icon: '⚠️' },
  info:    { bg: '#0f1e2a', border: '#6366f155', color: '#93c5fd', icon: 'ℹ️' },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 'calc(100vw - 40px)', pointerEvents: 'none' }}>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      {items.map((t) => {
        const s = STYLES[t.type];
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
            background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 14, fontWeight: 600,
            boxShadow: '0 8px 28px rgba(0,0,0,0.35)', animation: 'toast-in 0.25s ease', minWidth: 240,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
