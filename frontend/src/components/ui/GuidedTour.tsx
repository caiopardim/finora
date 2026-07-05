'use client';

import { useEffect, useState, useCallback } from 'react';

export interface TourStep {
  selector?: string;   // elemento a destacar; se ausente, tooltip centralizado
  title: string;
  text: string;
}

interface Props {
  steps: TourStep[];
  storageKey: string;  // controla "já viu" no localStorage
  autoStart?: boolean;
}

interface Rect { top: number; left: number; width: number; height: number; }

export default function GuidedTour({ steps, storageKey, autoStart = true }: Props) {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Inicia no primeiro uso
  useEffect(() => {
    if (!autoStart) return;
    try { if (!localStorage.getItem(storageKey)) setTimeout(() => setActive(true), 600); } catch {}
  }, [autoStart, storageKey]);

  const measure = useCallback(() => {
    const step = steps[i];
    if (!step?.selector) { setRect(null); return; }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // pequena espera pro scroll assentar antes de medir
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 300);
  }, [i, steps]);

  useEffect(() => {
    if (!active) return;
    measure();
    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => { window.removeEventListener('resize', onChange); window.removeEventListener('scroll', onChange, true); };
  }, [active, i, measure]);

  function finish() {
    try { localStorage.setItem(storageKey, new Date().toISOString()); } catch {}
    setActive(false);
    setI(0);
  }

  if (!active || steps.length === 0) return null;

  const step = steps[i];
  const isLast = i === steps.length - 1;
  const pad = 8;

  // Posição do tooltip
  const vw = typeof window !== 'undefined' ? window.innerWidth : 375;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 700;
  const tooltipW = Math.min(340, vw - 32);
  let tooltipStyle: React.CSSProperties;

  if (rect) {
    const below = rect.top + rect.height + pad + 180 < vh;
    const top = below ? rect.top + rect.height + pad + 10 : Math.max(16, rect.top - pad - 180);
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(16, Math.min(left, vw - tooltipW - 16));
    tooltipStyle = { position: 'fixed', top, left, width: tooltipW };
  } else {
    tooltipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: tooltipW };
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Overlay escuro. Com spotlight (buraco) via box-shadow quando há alvo. */}
      {rect ? (
        <div style={{
          position: 'fixed',
          top: rect.top - pad, left: rect.left - pad,
          width: rect.width + pad * 2, height: rect.height + pad * 2,
          borderRadius: 12, boxShadow: '0 0 0 9999px rgba(2,6,23,0.78)',
          transition: 'all 0.25s ease', pointerEvents: 'none',
          border: '2px solid rgba(34,197,94,0.7)',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.82)' }} />
      )}

      {/* Tooltip */}
      <div style={{
        ...tooltipStyle,
        background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: '18px 20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'tour-in 0.25s ease',
      }}>
        <style>{`@keyframes tour-in { from { opacity: 0; transform: translateY(8px) ${rect ? '' : 'translate(-50%,-50%)'}; } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', letterSpacing: '0.04em' }}>PASSO {i + 1} DE {steps.length}</span>
          <button onClick={finish} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>Pular tour</button>
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>{step.title}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{step.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {steps.map((_, idx) => (
              <div key={idx} style={{ width: idx === i ? 18 : 6, height: 6, borderRadius: 99, background: idx === i ? '#22c55e' : 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && (
              <button onClick={() => setI(i - 1)} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Voltar</button>
            )}
            <button onClick={() => (isLast ? finish() : setI(i + 1))} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {isLast ? 'Concluir 🎉' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
