import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Finora</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/auth/login" style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Login</Link>
          <Link href="/dashboard" style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}>Acessar Dashboard</Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(160deg,#0f172a 0%,#1e293b 100%)', padding: '80px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>
            <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 500 }}>IA + WhatsApp + Dashboard</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 52, fontWeight: 800, margin: '0 0 20px', lineHeight: 1.1 }}>
            Finanças que cabem<br />em uma mensagem
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 18, margin: '0 0 40px', lineHeight: 1.6 }}>
            Registre gastos pelo WhatsApp em linguagem natural. A IA cuida da categorização, você acompanha tudo no dashboard.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <Link href="/auth/login" style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 20px rgba(34,197,94,0.4)' }}>
              Começar grátis →
            </Link>
            <Link href="/preview" style={{ padding: '14px 32px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
              Ver demonstração
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Funcionalidades</p>
          <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 700, color: '#0f172a', margin: '0 0 56px' }}>Tudo que você precisa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { icon:'💬', title:'WhatsApp nativo', desc:'Registre qualquer movimentação sem abrir nenhum app. Só enviar uma mensagem.', color:'#22c55e' },
              { icon:'🤖', title:'IA inteligente', desc:'GPT-4 interpreta suas mensagens, categoriza e organiza automaticamente.', color:'#6366f1' },
              { icon:'📊', title:'Dashboard completo', desc:'Gráficos, filtros, categorias, metas e relatórios exportáveis em CSV.', color:'#f97316' },
              { icon:'⏰', title:'Contas a pagar', desc:'Gerencie vencimentos com alertas automáticos e marcação de pagamento.', color:'#ef4444' },
              { icon:'🎯', title:'Metas financeiras', desc:'Defina objetivos com prazo e acompanhe o progresso visualmente.', color:'#eab308' },
              { icon:'📈', title:'Relatórios inteligentes', desc:'Peça pelo WhatsApp: "Quanto gastei esse mês?" e receba na hora.', color:'#06b6d4' },
            ].map((f) => (
              <div key={f.title} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: f.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{f.icon}</div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', margin: '0 0 8px' }}>{f.title}</p>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 48px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>Pronto para começar?</h2>
        <p style={{ color: '#64748b', fontSize: 16, margin: '0 0 32px' }}>Configure em minutos. Comece a usar pelo WhatsApp hoje.</p>
        <Link href="/auth/login" style={{ padding: '14px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 20px rgba(34,197,94,0.35)' }}>
          Criar conta grátis →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>💰 Finora — Mais controle, menos planilhas</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Política de Privacidade','Termos de Uso','Suporte'].map(l => (
            <a key={l} href="#" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
