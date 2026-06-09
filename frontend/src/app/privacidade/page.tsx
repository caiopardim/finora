export default function PrivacidadePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>

        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13, textDecoration: 'none', marginBottom: 40 }}>
          ← Voltar
        </a>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-1px' }}>Política de Privacidade</h1>
        <p style={{ color: '#475569', fontSize: 14, margin: '0 0 48px' }}>Última atualização: junho de 2026</p>

        {[
          {
            title: '1. Informações que Coletamos',
            content: 'Coletamos as seguintes informações: (a) Dados de cadastro: nome, e-mail e número de WhatsApp; (b) Dados financeiros: transações, categorias, metas e informações que você registra via WhatsApp ou dashboard; (c) Dados de uso: como você interage com a plataforma; (d) Dados de pagamento: processados de forma segura pelo Mercado Pago — não armazenamos dados de cartão.',
          },
          {
            title: '2. Como Usamos suas Informações',
            content: 'Utilizamos suas informações para: (a) Fornecer e melhorar o serviço; (b) Processar pagamentos e gerenciar sua assinatura; (c) Enviar comunicações importantes sobre sua conta; (d) Oferecer suporte ao cliente; (e) Cumprir obrigações legais.',
          },
          {
            title: '3. Compartilhamento de Dados',
            content: 'Não vendemos seus dados pessoais. Compartilhamos informações apenas com: (a) Mercado Pago, para processamento de pagamentos; (b) Provedores de infraestrutura (Supabase, Railway) para armazenamento seguro; (c) OpenAI, para processamento das mensagens via IA — apenas o texto da mensagem é enviado, sem dados de identificação; (d) Autoridades legais, quando exigido por lei.',
          },
          {
            title: '4. Segurança dos Dados',
            content: 'Seus dados são protegidos com criptografia SSL em trânsito e criptografia em repouso. Utilizamos autenticação segura e controles de acesso rigorosos. Realizamos backups regulares e monitoramento contínuo de segurança.',
          },
          {
            title: '5. Retenção de Dados',
            content: 'Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento, seus dados são mantidos por 90 dias para eventual reativação e depois excluídos permanentemente, exceto dados necessários para obrigações fiscais ou legais.',
          },
          {
            title: '6. Seus Direitos (LGPD)',
            content: 'Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a: (a) Acessar seus dados; (b) Corrigir dados incorretos; (c) Solicitar exclusão dos seus dados; (d) Revogar consentimento; (e) Portabilidade dos dados. Para exercer esses direitos, entre em contato pelo suporte.',
          },
          {
            title: '7. Cookies',
            content: 'Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação e preferências). Não utilizamos cookies de rastreamento ou publicidade de terceiros.',
          },
          {
            title: '8. Alterações nesta Política',
            content: 'Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas por e-mail. O uso continuado após a notificação implica aceitação da nova política.',
          },
          {
            title: '9. Contato',
            content: 'Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo suporte da plataforma ou pelo WhatsApp. Responderemos em até 5 dias úteis.',
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px' }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.8, margin: 0 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 48, padding: '20px 24px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#4ade80', lineHeight: 1.7 }}>
            Dúvidas sobre privacidade? Fale com a gente:{' '}
            <a href="https://wa.me/5562982237323" target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontWeight: 600 }}>
              +55 62 98223-7323
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
