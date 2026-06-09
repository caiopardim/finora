export default function TermosPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>

        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13, textDecoration: 'none', marginBottom: 40 }}>
          ← Voltar
        </a>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-1px' }}>Termos de Uso</h1>
        <p style={{ color: '#475569', fontSize: 14, margin: '0 0 48px' }}>Última atualização: junho de 2026</p>

        {[
          {
            title: '1. Aceitação dos Termos',
            content: 'Ao acessar ou utilizar a plataforma Finora, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize nossos serviços. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.',
          },
          {
            title: '2. Descrição do Serviço',
            content: 'A Finora é uma plataforma de gestão financeira pessoal que permite ao usuário registrar receitas e despesas via WhatsApp com auxílio de inteligência artificial, além de acompanhar suas finanças por meio de um dashboard web. O serviço é oferecido mediante assinatura mensal ou anual.',
          },
          {
            title: '3. Cadastro e Conta',
            content: 'Para utilizar a Finora, você deve criar uma conta com dados verdadeiros e manter suas informações atualizadas. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado.',
          },
          {
            title: '4. Planos e Pagamentos',
            content: 'A Finora oferece planos de assinatura mensal e anual. Os valores são cobrados antecipadamente no momento da contratação. O plano mensal é renovado automaticamente a cada 30 dias e o plano anual a cada 12 meses, salvo cancelamento prévio. Os preços podem ser alterados com aviso prévio de 30 dias.',
          },
          {
            title: '5. Garantia de 7 Dias',
            content: 'Oferecemos garantia de satisfação de 7 (sete) dias a partir da data da primeira cobrança. Caso não esteja satisfeito com o serviço, entre em contato pelo suporte dentro deste prazo e realizaremos o reembolso integral do valor pago, sem questionamentos.',
          },
          {
            title: '6. Cancelamento',
            content: 'Você pode cancelar sua assinatura a qualquer momento pelo dashboard, na seção "Meu Plano". O cancelamento interrompe a renovação automática, mas o acesso permanece ativo até o fim do período pago. Não há reembolso proporcional após o período de garantia de 7 dias.',
          },
          {
            title: '7. Uso Aceitável',
            content: 'Você concorda em utilizar a Finora apenas para fins lícitos e pessoais. É proibido utilizar o serviço para: (a) atividades ilegais; (b) envio de spam ou mensagens abusivas; (c) tentativas de acesso não autorizado a sistemas; (d) reprodução ou distribuição não autorizada do serviço.',
          },
          {
            title: '8. Privacidade e Dados',
            content: 'O tratamento dos seus dados pessoais é regido pela nossa Política de Privacidade, que faz parte integrante destes Termos. Seus dados financeiros são armazenados de forma criptografada e não são compartilhados com terceiros sem sua autorização, exceto quando exigido por lei.',
          },
          {
            title: '9. Propriedade Intelectual',
            content: 'Todo o conteúdo da plataforma Finora, incluindo marca, logo, software, design e textos, é de propriedade exclusiva da Finora ou de seus licenciadores. Nenhum direito é transferido ao usuário além do uso limitado do serviço conforme descrito nestes termos.',
          },
          {
            title: '10. Limitação de Responsabilidade',
            content: 'A Finora não se responsabiliza por decisões financeiras tomadas com base nas informações fornecidas pela plataforma. O serviço é fornecido "como está", sem garantias de disponibilidade ininterrupta. Nossa responsabilidade máxima está limitada ao valor pago pelo usuário nos últimos 3 meses.',
          },
          {
            title: '11. Alterações nos Termos',
            content: 'Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas por e-mail com antecedência mínima de 15 dias. O uso continuado após este prazo implica aceitação dos novos termos.',
          },
          {
            title: '12. Contato',
            content: 'Para dúvidas sobre estes Termos, entre em contato pelo suporte disponível na plataforma ou pelo WhatsApp. Responderemos em até 2 dias úteis.',
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px' }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.8, margin: 0 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 48, padding: '20px 24px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#4ade80', lineHeight: 1.7 }}>
            Dúvidas? Fale com a gente pelo WhatsApp:{' '}
            <a href="https://wa.me/5562982237323" target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontWeight: 600 }}>
              +55 62 98223-7323
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
