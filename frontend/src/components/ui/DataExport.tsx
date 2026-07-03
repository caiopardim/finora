'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Download, FileText, Database, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

function csvCell(v: any): string {
  const s = v == null ? '' : String(v);
  // Escapa aspas e envolve em aspas se tiver separador/quebra
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: `${mime};charset=utf-8;` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function DataExport() {
  const { c } = useTheme();
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);
  const [msg, setMsg]   = useState('');

  async function exportCSV() {
    setBusy('csv'); setMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMsg('Sessão expirada.'); setBusy(null); return; }
      const [txRes, catRes, walRes] = await Promise.all([
        supabase.from('transactions').select('date,type,amount,description,category_id,wallet_id').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('categories').select('id,name').eq('user_id', user.id),
        supabase.from('wallets').select('id,name').eq('user_id', user.id),
      ]);
      if (txRes.error) throw txRes.error;
      const catMap = new Map((catRes.data || []).map((x: any) => [x.id, x.name]));
      const walMap = new Map((walRes.data || []).map((x: any) => [x.id, x.name]));

      const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Valor (R$)'];
      const rows = (txRes.data || []).map((t: any) => [
        dayjs(t.date).format('DD/MM/YYYY'),
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.description || '',
        catMap.get(t.category_id) || '',
        walMap.get(t.wallet_id) || '',
        Number(t.amount).toFixed(2).replace('.', ','),
      ]);
      const csv = [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
      download(`finora-transacoes-${dayjs().format('YYYY-MM-DD')}.csv`, csv, 'text/csv');
      setMsg(`${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'} exportada${rows.length === 1 ? '' : 's'}. ✅`);
    } catch (e: any) {
      setMsg('Erro ao exportar: ' + (e?.message || 'tente novamente'));
    }
    setBusy(null);
  }

  async function exportJSON() {
    setBusy('json'); setMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMsg('Sessão expirada.'); setBusy(null); return; }
      const uid = user.id;
      const [transactions, categories, goals, bills, wallets, appointments, shoppingLists] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', uid),
        supabase.from('categories').select('*').eq('user_id', uid),
        supabase.from('goals').select('*').eq('user_id', uid),
        supabase.from('bills').select('*').eq('user_id', uid),
        supabase.from('wallets').select('*').eq('user_id', uid),
        supabase.from('appointments').select('*').eq('user_id', uid),
        supabase.from('shopping_lists').select('*, items:shopping_list_items(*)').eq('user_id', uid),
      ]);
      const backup = {
        exported_at: new Date().toISOString(),
        app: 'Finora',
        user_email: user.email,
        transactions: transactions.data || [],
        categories: categories.data || [],
        goals: goals.data || [],
        bills: bills.data || [],
        wallets: wallets.data || [],
        appointments: appointments.data || [],
        shopping_lists: shoppingLists.data || [],
      };
      download(`finora-backup-${dayjs().format('YYYY-MM-DD')}.json`, JSON.stringify(backup, null, 2), 'application/json');
      const total = backup.transactions.length + backup.categories.length + backup.goals.length + backup.bills.length + backup.wallets.length + backup.appointments.length + backup.shopping_lists.length;
      setMsg(`Backup completo gerado (${total} registros). ✅`);
    } catch (e: any) {
      setMsg('Erro ao gerar backup: ' + (e?.message || 'tente novamente'));
    }
    setBusy(null);
  }

  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${c.border}`, background: c.bg, color: c.text, cursor: busy ? 'wait' : 'pointer',
    fontSize: 14, fontWeight: 600, textAlign: 'left', width: '100%',
  };

  return (
    <div>
      <p style={{ color: c.textSecondary, fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>
        Mantenha uma cópia local do seu histórico. Seus dados são seus — leve-os quando quiser.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        <button onClick={exportCSV} disabled={!!busy} style={btn}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#22c55e18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {busy === 'csv' ? <Loader2 size={18} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={18} color="#22c55e" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: c.text }}>Exportar transações (CSV)</div>
            <div style={{ fontSize: 12, color: c.textMuted, fontWeight: 400 }}>Abre no Excel, Google Sheets, Numbers</div>
          </div>
          <Download size={16} color={c.textMuted} />
        </button>

        <button onClick={exportJSON} disabled={!!busy} style={btn}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#6366f118', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {busy === 'json' ? <Loader2 size={18} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} /> : <Database size={18} color="#6366f1" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: c.text }}>Backup completo (JSON)</div>
            <div style={{ fontSize: 12, color: c.textMuted, fontWeight: 400 }}>Tudo: transações, metas, faturas, contas, agenda, listas</div>
          </div>
          <Download size={16} color={c.textMuted} />
        </button>
      </div>
      {msg && <p style={{ marginTop: 12, fontSize: 13, color: msg.startsWith('Erro') ? '#ef4444' : '#16a34a' }}>{msg}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
