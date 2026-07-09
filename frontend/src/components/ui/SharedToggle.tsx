'use client';

import { useTheme } from '@/lib/theme-context';

// Toggle "Compartilhado com o casal". Renderiza nada se não houver household.
export default function SharedToggle({ householdId, shared, onChange }: {
  householdId: string | null;
  shared: boolean;
  onChange: (v: boolean) => void;
}) {
  const { c } = useTheme();
  if (!householdId) return null;
  return (
    <button type="button" onClick={() => onChange(!shared)} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%',
      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
      border: `1.5px solid ${shared ? '#6366f1' : c.border}`,
      background: shared ? '#6366f110' : c.inputBg, textAlign: 'left',
    }}>
      <span style={{ fontSize: 13, color: shared ? '#6366f1' : c.textMuted, fontWeight: 500 }}>
        👫 {shared ? 'Compartilhado com o casal' : 'Só pra você (pessoal)'}
      </span>
      <span style={{ width: 40, height: 22, borderRadius: 99, background: shared ? '#6366f1' : c.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: shared ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }}/>
      </span>
    </button>
  );
}
