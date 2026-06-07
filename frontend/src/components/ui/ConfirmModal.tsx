'use client';

import { useTheme } from '@/lib/theme-context';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { c } = useTheme();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onCancel}>
      <div style={{
        background: c.surface,
        borderRadius: 20,
        padding: 28,
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: `1px solid ${c.border}`,
      }} onClick={e => e.stopPropagation()}>

        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: danger ? '#fef2f2' : '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
        }}>
          <AlertTriangle size={24} color={danger ? '#dc2626' : '#3b82f6'} />
        </div>

        {/* Text */}
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 17, color: c.text }}>{title}</p>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: c.textMuted, lineHeight: 1.5 }}>{message}</p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '11px 0', borderRadius: 11,
            border: `1.5px solid ${c.border}`,
            background: c.surface, color: c.textMuted,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '11px 0', borderRadius: 11,
            border: 'none',
            background: danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
            color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: danger ? '0 4px 14px rgba(239,68,68,0.3)' : '0 4px 14px rgba(59,130,246,0.3)',
          }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
