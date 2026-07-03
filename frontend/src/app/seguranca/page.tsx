export default function SegurancaPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>

        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13, textDecoration: 'none', marginBottom: 40 }}>
          ← Voltar
        </a>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 99, padding: '6px 14px', marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>Conexão criptografada (HTTPS)</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-1px' }}>Segurança</h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 48px', lineHeight: 1.7 }}>
          Levamos a proteção dos seus dados a sério. Aqui explicamos, de forma transparente, como o Finora protege suas informações — e como você pode se proteger ainda mais.
        </p>

        {[
          {
            title: '🔐 Conexão segura (HTTPS/TLS)',
            content: 'Toda a comunicação entre o seu navegador e o Finora é protegida por TLS (o mesmo protocolo usado por bancos), com certificado válido e renovado automaticamente. Isso significa que os dados trafegam criptografados e não podem ser lidos por terceiros no caminho.',
          },
          {
            title: '🗄️ Criptografia dos dados',
            content: 'Seus dados são armazenados em infraestrutura gerenciada (Supabase/PostgreSQL) com criptografia em repouso (AES-256) e criptografia em trânsito. Ou seja, tanto no armazenamento quanto na transmissão, suas informações ficam protegidas.',
          },
          {
            title: '🧱 Isolamento por usuário (RLS)',
            content: 'Usamos Row Level Security (segurança em nível de linha) no banco de dados: cada usuário só consegue acessar os próprios dados. Mesmo que uma requisição tente ler informações de outra conta, o banco bloqueia no nível mais baixo.',
          },
          {
            title: '🔑 Senhas e autenticação',
            content: 'Suas senhas nunca são armazenadas em texto puro — são protegidas com hashing forte (bcrypt) pelo nosso provedor de autenticação. Nós, do Finora, não temos acesso à sua senha. A redefinição de senha é feita por link seguro enviado ao seu e-mail.',
          },
          {
            title: '💳 Pagamentos',
            content: 'Os pagamentos são processados diretamente pelo Mercado Pago, com toda a segurança de um provedor certificado (PCI-DSS). O Finora não armazena números de cartão de crédito — esses dados nunca passam pelos nossos servidores.',
          },
          {
            title: '🛡️ Autenticação em dois fatores (2FA)',
            content: 'Disponível! Você pode ativar a verificação em duas etapas em Configurações → Segurança. Com o 2FA, além da senha o login pede um código gerado pelo seu app autenticador (Google Authenticator, Authy, 1Password…) — mesmo que alguém descubra sua senha, não consegue entrar sem o código.',
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px' }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.8, margin: 0 }}>{section.content}</p>
          </div>
        ))}

        {/* Boas práticas para o usuário */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '48px 0 18px' }}>Boas práticas recomendadas</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { icon: '🔓', title: 'Cuidado com Wi-Fi público', text: 'Evite acessar sua conta em redes Wi-Fi públicas sem uma VPN. Redes abertas podem ser monitoradas por terceiros.' },
            { icon: '🔤', title: 'Use senhas fortes e exclusivas', text: 'Crie uma senha longa, com letras, números e símbolos, e não a reutilize em outros sites. Um gerenciador de senhas ajuda.' },
            { icon: '📲', title: 'Mantenha o 2FA habilitado', text: 'Ative a verificação em duas etapas em Configurações → Segurança. Ela protege sua conta mesmo se a senha vazar.' },
            { icon: '🤫', title: 'Nunca compartilhe códigos', text: 'O Finora nunca vai pedir sua senha ou códigos de verificação por mensagem. Nunca compartilhe esses códigos com ninguém.' },
            { icon: '📱', title: 'Proteja seu WhatsApp', text: 'Como o Finora funciona pelo WhatsApp, mantenha a verificação em duas etapas do próprio WhatsApp ativada e o celular bloqueado.' },
          ].map((tip) => (
            <div key={tip.title} style={{ display: 'flex', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{tip.icon}</span>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{tip.title}</p>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{tip.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, padding: '20px 24px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#4ade80', lineHeight: 1.7 }}>
            Encontrou algo suspeito ou tem dúvidas sobre segurança? Fale com a gente:{' '}
            <a href="https://wa.me/5562982237323" target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontWeight: 600 }}>
              WhatsApp do suporte
            </a>
            . Respondemos rápido.
          </p>
        </div>

      </div>
    </div>
  );
}
