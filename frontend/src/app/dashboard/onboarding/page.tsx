'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { Check, ArrowRight, Wallet, Tag, Target } from 'lucide-react';

const WALLET_ICONS  = ['🏦','💳','💵','🏧','📱','💰'];
const WALLET_COLORS = ['#6366f1','#22c55e','#f97316','#3b82f6','#ec4899','#06b6d4'];
const CAT_SUGGESTIONS = [
  { name: 'Alimentação', icon: '🍔', color: '#f97316' },
  { name: 'Transporte',  icon: '🚗', color: '#3b82f6' },
  { name: 'Moradia',     icon: '🏠', color: '#8b5cf6' },
  { name: 'Saúde',       icon: '💊', color: '#ec4899' },
  { name: 'Lazer',       icon: '🎮', color: '#eab308' },
  { name: 'Educação',    icon: '📚', color: '#10b981' },
  { name: 'Roupas',      icon: '👕', color: '#06b6d4' },
  { name: 'Mercado',     icon: '🛒', color: '#22c55e' },
];

export default function OnboardingPage() {
  const { c } = useTheme();
  const router = useRouter();
  const [step, setStep]   = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 - name
  const [name, setName] = useState('');

  // Step 1 - wallet
  const [wallet, setWallet] = useState({ name: '', icon: '🏦', color: '#6366f1', type: 'bank' });

  // Step 2 - categories
  const [selectedCats, setSelectedCats] = useState<typeof CAT_SUGGESTIONS>([]);

  // Step 3 - goal (optional)
  const [goal, setGoal] = useState({ name: '', amount: '' });

  const steps = [
    { label: 'Bem-vindo', icon: '👋' },
    { label: 'Sua conta', icon: '🏦' },
    { label: 'Categorias', icon: '🏷️' },
    { label: 'Primeira meta', icon: '🎯' },
    { label: 'Como usar', icon: '🚀' },
  ];

  async function finish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({ name, onboarded: true }).eq('id', user.id);

    if (wallet.name) {
      await supabase.from('wallets').insert({ user_id: user.id, name: wallet.name, icon: wallet.icon, color: wallet.color, type: wallet.type });
    }
    if (selectedCats.length > 0) {
      await supabase.from('categories').insert(
        selectedCats.map(cat => ({ user_id: user.id, name: cat.name, icon: cat.icon, color: cat.color, type: 'expense' }))
      );
    }
    if (goal.name && goal.amount) {
      await supabase.from('goals').insert({ user_id: user.id, name: goal.name, target_amount: parseFloat(goal.amount), icon: '🎯', color: '#22c55e', current_amount: 0 });
    }
    router.push('/dashboard');
  }

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '12px 14px',
    borderRadius: 12, border: `1.5px solid ${c.border}`,
    fontSize: 15, color: c.text, background: c.input,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32, justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                background: i < step ? '#22c55e' : i === step ? 'linear-gradient(135deg,#22c55e,#16a34a)' : c.surface,
                border: i === step ? 'none' : `2px solid ${i < step ? '#22c55e' : c.border}`,
                color: i <= step ? '#fff' : c.textFaint, fontWeight: 700,
              }}>
                {i < step ? <Check size={14}/> : s.icon}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 32, height: 2, background: i < step ? '#22c55e' : c.border, borderRadius: 99 }}/>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: c.surface, borderRadius: 24, border: `1px solid ${c.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', overflow: 'hidden' }}>

          {/* Step 0 - Welcome */}
          {step === 0 && (
            <div style={{ padding: 36, textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>💰</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: c.text, margin: '0 0 8px' }}>Bem-vindo ao Finora!</h1>
              <p style={{ fontSize: 15, color: c.textMuted, margin: '0 0 28px', lineHeight: 1.6 }}>Vamos configurar sua conta em 4 passos rápidos para você começar a controlar suas finanças.</p>
              <div style={{ textAlign: 'left', marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Como quer ser chamado?</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" style={inputStyle} autoFocus onKeyDown={e => e.key === 'Enter' && name && setStep(1)}/>
              </div>
              <button disabled={!name} onClick={() => setStep(1)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: name ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#e2e8f0', color: name ? '#fff' : '#94a3b8', fontSize: 15, fontWeight: 700, cursor: name ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Começar <ArrowRight size={18}/>
              </button>
            </div>
          )}

          {/* Step 1 - Wallet */}
          {step === 1 && (
            <div style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={22} color="#6366f1"/></div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: c.text }}>Cadastre sua conta</h2>
                  <p style={{ margin: 0, fontSize: 13, color: c.textFaint }}>Ex: Nubank, Bradesco, Carteira física</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Tipo</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[{ v:'bank',label:'Banco',icon:'🏦' },{ v:'cash',label:'Dinheiro',icon:'💵' },{ v:'credit',label:'Crédito',icon:'💳' },{ v:'invest',label:'Investimento',icon:'📈' }].map(t => (
                      <button key={t.v} type="button" onClick={() => setWallet(w => ({ ...w, type: t.v }))} style={{ padding:'10px', borderRadius:10, border:`2px solid ${wallet.type===t.v?'#6366f1':c.border}`, background:wallet.type===t.v?'#eef2ff':c.surface, cursor:'pointer', fontSize:13, fontWeight:wallet.type===t.v?700:400, color:wallet.type===t.v?'#6366f1':c.textMuted, display:'flex', alignItems:'center', gap:8 }}>
                        <span>{t.icon}</span>{t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Nome *</label>
                  <input value={wallet.name} onChange={e => setWallet(w => ({ ...w, name: e.target.value }))} placeholder="Ex: Nubank, Bradesco..." style={inputStyle}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Ícone</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {WALLET_ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setWallet(w => ({ ...w, icon: ic }))} style={{ width:38, height:38, borderRadius:9, fontSize:18, border:`2px solid ${wallet.icon===ic?wallet.color:c.border}`, background:wallet.icon===ic?wallet.color+'20':'transparent', cursor:'pointer' }}>{ic}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Cor</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {WALLET_COLORS.map(col => (
                      <button key={col} type="button" onClick={() => setWallet(w => ({ ...w, color: col }))} style={{ width:28, height:28, borderRadius:'50%', background:col, border:wallet.color===col?`3px solid ${c.text}`:'3px solid transparent', cursor:'pointer' }}/>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:24 }}>
                <button onClick={() => setStep(2)} style={{ flex:1, padding:'12px', borderRadius:12, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:14, fontWeight:500, cursor:'pointer' }}>Pular</button>
                <button onClick={() => setStep(2)} disabled={!wallet.name} style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:wallet.name?'linear-gradient(135deg,#6366f1,#4f46e5)':'#e2e8f0', color:wallet.name?'#fff':'#94a3b8', fontSize:14, fontWeight:700, cursor:wallet.name?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  Continuar <ArrowRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* Step 2 - Categories */}
          {step === 2 && (
            <div style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tag size={22} color="#f97316"/></div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: c.text }}>Escolha suas categorias</h2>
                  <p style={{ margin: 0, fontSize: 13, color: c.textFaint }}>Selecione as que fazem sentido pra você</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '20px 0' }}>
                {CAT_SUGGESTIONS.map(cat => {
                  const sel = selectedCats.some(s => s.name === cat.name);
                  return (
                    <button key={cat.name} type="button" onClick={() => setSelectedCats(prev => sel ? prev.filter(s => s.name !== cat.name) : [...prev, cat])} style={{
                      padding: '12px 14px', borderRadius: 12, border: `2px solid ${sel ? cat.color : c.border}`,
                      background: sel ? cat.color + '15' : c.surface, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      fontSize: 14, fontWeight: sel ? 700 : 400, color: sel ? cat.color : c.textMuted,
                    }}>
                      <span style={{ fontSize: 20 }}>{cat.icon}</span>{cat.name}
                      {sel && <Check size={14} style={{ marginLeft: 'auto' }} color={cat.color}/>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(3)} style={{ flex:1, padding:'12px', borderRadius:12, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:14, fontWeight:500, cursor:'pointer' }}>Pular</button>
                <button onClick={() => setStep(3)} style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {selectedCats.length > 0 ? `Adicionar ${selectedCats.length} categoria${selectedCats.length>1?'s':''}` : 'Continuar'} <ArrowRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Goal */}
          {step === 3 && (
            <div style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={22} color="#22c55e"/></div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: c.text }}>Crie sua primeira meta</h2>
                  <p style={{ margin: 0, fontSize: 13, color: c.textFaint }}>Opcional — pode fazer depois também</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Qual seu objetivo?</label>
                  <input value={goal.name} onChange={e => setGoal(g => ({ ...g, name: e.target.value }))} placeholder="Ex: Viagem, Carro novo, Reserva de emergência..." style={inputStyle}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Quanto quer guardar?</label>
                  <input type="number" value={goal.amount} onChange={e => setGoal(g => ({ ...g, amount: e.target.value }))} placeholder="R$ 5.000,00" style={inputStyle}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(4)} style={{ flex:1, padding:'12px', borderRadius:12, border:`1.5px solid ${c.border}`, background:c.surface, color:c.textMuted, fontSize:14, fontWeight:500, cursor:'pointer' }}>Pular</button>
                <button onClick={() => setStep(4)} style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  Continuar <ArrowRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* Step 4 - Como usar */}
          {step === 4 && (
            <div style={{ padding: 32 }}>
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>🚀</div>
                <h2 style={{ margin: '0 0 6px', fontSize: 21, fontWeight: 800, color: c.text }}>Tudo pronto, {name || 'pessoa'}!</h2>
                <p style={{ margin: 0, fontSize: 14, color: c.textMuted, lineHeight: 1.6 }}>Veja como o Finora funciona no dia a dia:</p>
              </div>

              {/* Destaque WhatsApp */}
              <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: '18px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>💬</span>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>Registre tudo pelo WhatsApp</p>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13.5, color: c.textMuted, lineHeight: 1.6 }}>
                  Esse é o coração do Finora! Manda mensagem como se fosse pra um amigo:
                </p>
                {['💸 "Gastei 50 no mercado"', '💰 "Recebi 3.000 de salário"', '📊 "Quanto gastei este mês?"', '📅 "Agenda dentista quinta às 10h"'].map((ex) => (
                  <p key={ex} style={{ margin: '4px 0', fontSize: 13, color: c.textSecondary, fontStyle: 'italic' }}>{ex}</p>
                ))}
              </div>

              {/* Funcionalidades */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
                {[
                  { icon: '📊', t: 'Dashboard', d: 'Tudo organizado em tempo real' },
                  { icon: '📅', t: 'Agenda', d: 'Sincroniza com o Google' },
                  { icon: '🎯', t: 'Metas', d: 'Acompanhe seus objetivos' },
                  { icon: '🛒', t: 'Lista de compras', d: 'Marque o que comprou' },
                ].map((f) => (
                  <div key={f.t} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: c.text }}>{f.t}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: c.textFaint, lineHeight: 1.4 }}>{f.d}</p>
                  </div>
                ))}
              </div>

              <p style={{ textAlign: 'center', fontSize: 12.5, color: c.textFaint, margin: '0 0 18px' }}>
                💡 Precisa de ajuda? É só mandar <strong>"ajuda"</strong> no WhatsApp que eu te mostro tudo.
              </p>

              <button onClick={finish} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Configurando...' : '🎉 Ir para o Dashboard'}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: c.textFaint }}>
          Passo {step + 1} de {steps.length}
        </p>
      </div>
    </div>
  );
}
