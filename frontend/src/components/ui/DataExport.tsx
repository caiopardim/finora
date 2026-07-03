'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Download, FileText, FileSpreadsheet, FileType, Database, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

type Busy = 'csv' | 'xlsx' | 'pdf' | 'json' | null;

interface TxRow {
  date: string;      // DD/MM/YYYY
  typeLabel: string; // Receita / Despesa
  isIncome: boolean;
  description: string;
  category: string;
  wallet: string;
  amount: number;
}

function csvCell(v: any): string {
  const s = v == null ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function brMoney(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function download(filename: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function DataExport() {
  const { c } = useTheme();
  const [busy, setBusy] = useState<Busy>(null);
  const [msg, setMsg]   = useState('');

  // Carrega as transações do usuário com nomes de categoria/conta resolvidos por id
  async function loadTransactions(): Promise<{ email: string; rows: TxRow[] }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão expirada.');
    const [txRes, catRes, walRes] = await Promise.all([
      supabase.from('transactions').select('date,type,amount,description,category_id,wallet_id').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('categories').select('id,name').eq('user_id', user.id),
      supabase.from('wallets').select('id,name').eq('user_id', user.id),
    ]);
    if (txRes.error) throw txRes.error;
    const catMap = new Map((catRes.data || []).map((x: any) => [x.id, x.name]));
    const walMap = new Map((walRes.data || []).map((x: any) => [x.id, x.name]));
    const rows: TxRow[] = (txRes.data || []).map((t: any) => ({
      date: dayjs(t.date).format('DD/MM/YYYY'),
      typeLabel: t.type === 'income' ? 'Receita' : 'Despesa',
      isIncome: t.type === 'income',
      description: t.description || '',
      category: catMap.get(t.category_id) || '',
      wallet: walMap.get(t.wallet_id) || '',
      amount: Number(t.amount),
    }));
    return { email: user.email || '', rows };
  }

  async function run(kind: Busy, fn: () => Promise<string>) {
    setBusy(kind); setMsg('');
    try { setMsg(await fn()); }
    catch (e: any) { setMsg('Erro ao exportar: ' + (e?.message || 'tente novamente')); }
    setBusy(null);
  }

  const exportCSV = () => run('csv', async () => {
    const { rows } = await loadTransactions();
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Valor (R$)'];
    const body = rows.map((r) => [r.date, r.typeLabel, r.description, r.category, r.wallet, brMoney(r.amount)]);
    const csv = [headers, ...body].map((r) => r.map(csvCell).join(';')).join('\n');
    download(`finora-transacoes-${dayjs().format('YYYY-MM-DD')}.csv`, '﻿' + csv, 'text/csv');
    return `${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'} exportada${rows.length === 1 ? '' : 's'}. ✅`;
  });

  const exportXLSX = () => run('xlsx', async () => {
    const { rows } = await loadTransactions();
    const XLSX = await import('xlsx');
    const aoa = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Valor (R$)'],
      ...rows.map((r) => [r.date, r.typeLabel, r.description, r.category, r.wallet, r.amount]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 34 }, { wch: 18 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transações');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(`finora-transacoes-${dayjs().format('YYYY-MM-DD')}.xlsx`, out, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return `Excel gerado com ${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'}. ✅`;
  });

  const exportPDF = () => run('pdf', async () => {
    const { email, rows } = await loadTransactions();
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const income = rows.filter((r) => r.isIncome).reduce((s, r) => s + r.amount, 0);
    const expense = rows.filter((r) => !r.isIncome).reduce((s, r) => s + r.amount, 0);

    doc.setFontSize(18); doc.setTextColor(15, 23, 42);
    doc.text('Finora — Extrato Financeiro', 14, 18);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`${email}  ·  Gerado em ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 25);
    doc.setFontSize(11); doc.setTextColor(22, 163, 74);
    doc.text(`Receitas: R$ ${brMoney(income)}`, 14, 34);
    doc.setTextColor(220, 38, 38);
    doc.text(`Despesas: R$ ${brMoney(expense)}`, 80, 34);
    doc.setTextColor(15, 23, 42);
    doc.text(`Saldo: R$ ${brMoney(income - expense)}`, 150, 34);

    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Valor (R$)']],
      body: rows.map((r) => [r.date, r.typeLabel, r.description, r.category, r.wallet, brMoney(r.amount)]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94] },
      columnStyles: { 5: { halign: 'right' } },
    });
    doc.save(`finora-extrato-${dayjs().format('YYYY-MM-DD')}.pdf`);
    return `PDF gerado com ${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'}. ✅`;
  });

  const exportJSON = () => run('json', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão expirada.');
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
      exported_at: new Date().toISOString(), app: 'Finora', user_email: user.email,
      transactions: transactions.data || [], categories: categories.data || [], goals: goals.data || [],
      bills: bills.data || [], wallets: wallets.data || [], appointments: appointments.data || [],
      shopping_lists: shoppingLists.data || [],
    };
    download(`finora-backup-${dayjs().format('YYYY-MM-DD')}.json`, JSON.stringify(backup, null, 2), 'application/json');
    const total = backup.transactions.length + backup.categories.length + backup.goals.length + backup.bills.length + backup.wallets.length + backup.appointments.length + backup.shopping_lists.length;
    return `Backup completo gerado (${total} registros). ✅`;
  });

  const items: Array<{ kind: Busy; onClick: () => void; icon: any; color: string; title: string; sub: string }> = [
    { kind: 'csv',  onClick: exportCSV,  icon: FileText,        color: '#22c55e', title: 'Transações (CSV)',   sub: 'Abre no Excel, Google Sheets, Numbers' },
    { kind: 'xlsx', onClick: exportXLSX, icon: FileSpreadsheet, color: '#16a34a', title: 'Transações (Excel .xlsx)', sub: 'Planilha Excel nativa, colunas formatadas' },
    { kind: 'pdf',  onClick: exportPDF,  icon: FileType,        color: '#ef4444', title: 'Extrato (PDF)',       sub: 'Pronto para imprimir, com totais' },
    { kind: 'json', onClick: exportJSON, icon: Database,        color: '#6366f1', title: 'Backup completo (JSON)', sub: 'Tudo: transações, metas, faturas, contas, agenda, listas' },
  ];

  return (
    <div>
      <p style={{ color: c.textSecondary, fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>
        Mantenha uma cópia local do seu histórico. Seus dados são seus — leve-os quando quiser.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map(({ kind, onClick, icon: Icon, color, title, sub }) => (
          <button key={kind} onClick={onClick} disabled={!!busy} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
            border: `1px solid ${c.border}`, background: c.bg, cursor: busy ? 'wait' : 'pointer', width: '100%', textAlign: 'left',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {busy === kind ? <Loader2 size={18} color={color} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={18} color={color} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: c.text, fontSize: 14, fontWeight: 600 }}>{title}</div>
              <div style={{ fontSize: 12, color: c.textMuted }}>{sub}</div>
            </div>
            <Download size={16} color={c.textMuted} />
          </button>
        ))}
      </div>
      {msg && <p style={{ marginTop: 12, fontSize: 13, color: msg.startsWith('Erro') ? '#ef4444' : '#16a34a' }}>{msg}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
