import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI, { toFile } from 'openai';
import * as dayjs from 'dayjs';

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface MessageIntent {
  action:
    | 'register_transaction'
    | 'query_report'
    | 'create_appointment'
    | 'list_appointments'
    | 'delete_transaction'
    | 'create_goal'
    | 'list_goals'
    | 'add_goal_progress'
    | 'create_bill'
    | 'list_bills'
    | 'mark_bill_paid'
    | 'ask_advice'
    | 'financial_diagnosis'
    | 'economy_suggestions'
    | 'simulate_goal'
    | 'create_shopping_list'
    | 'add_shopping_items'
    | 'view_shopping_list'
    | 'estimate_list_cost'
    | 'mark_shopping_item'
    | 'unmark_shopping_item'
    | 'complete_shopping_list'
    | 'unknown';
  transaction?: ParsedTransaction;
  query?: string;
  appointment?: { title: string; description?: string; scheduledAt: string };
  delete?: { description?: string; amount?: number; date?: string };
  goal?: { name: string; target_amount: number; deadline?: string; icon?: string };
  goal_progress?: { name: string; amount: number };
  bill?: { description: string; amount: number; due_date: string; is_recurring: boolean; recurrence_interval?: 'weekly' | 'monthly' | 'yearly' };
  bill_name?: string;
  goal_name?: string;
  shopping_list?: { name: string; category?: string };
  shopping_items?: Array<{ name: string; quantity?: number; unit?: string }>;
  shopping_item_names?: string[];
}

@Injectable()
export class AiService {
  private readonly anthropic: Anthropic | null = null;
  private readonly openai: OpenAI | null = null; // kept for Whisper audio transcription
  private readonly logger = new Logger(AiService.name);

  constructor(private config: ConfigService) {
    const anthropicKey = config.get('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }

    const openaiKey = config.get('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  async parseMessage(message: string, userCategories?: string[]): Promise<MessageIntent> {
    if (!this.anthropic) return { action: 'unknown' };
    const today = dayjs().format('YYYY-MM-DD');

    const categoryList = userCategories && userCategories.length > 0
      ? userCategories.join(', ')
      : 'Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Internet/Telefone, Serviços, Salário, Freelance, Investimentos, Outros';

    const systemPrompt = `Você é a Finora, assistente financeira pessoal. Hoje é ${today}.

Analise a mensagem e retorne um JSON com UMA das ações abaixo:

━━━ TRANSAÇÕES ━━━
{
  "action": "register_transaction",
  "transaction": {
    "type": "income" | "expense",
    "amount": number,
    "category": string (EXATAMENTE uma de: ${categoryList}),
    "description": string,
    "date": "YYYY-MM-DD"
  }
}
Use para: "gastei", "paguei", "comprei", "recebi", "ganhei", "entrou".

{
  "action": "delete_transaction",
  "delete": {
    "description": string,
    "amount": number (se mencionado),
    "date": "YYYY-MM-DD" (se mencionado)
  }
}
Use para: "cancela", "apaga", "exclui", "desfaz", "errei", "lancei errado".

━━━ RELATÓRIOS / CONSULTAS ━━━
{
  "action": "query_report",
  "query": string
}
Use para: quanto gastei, saldo, resumo, relatório, balanço, onde gastei mais, receitas, extrato.

━━━ AGENDA / COMPROMISSOS ━━━
{
  "action": "create_appointment",
  "appointment": {
    "title": string,
    "description": string (opcional),
    "scheduledAt": "YYYY-MM-DDTHH:mm:00"
  }
}
Use para: agendar, compromisso, reunião, consulta, dentista, médico, lembrete, marcar evento.

{
  "action": "list_appointments"
}
Use para: "meus compromissos", "agenda", "o que tenho marcado", "próximos eventos".

━━━ METAS FINANCEIRAS ━━━
{
  "action": "create_goal",
  "goal": {
    "name": string (nome da meta, ex: "Viagem para Europa", "Reserva de emergência"),
    "target_amount": number (valor total a atingir),
    "deadline": "YYYY-MM-DD" (prazo, se mencionado),
    "icon": string (emoji representativo, ex: "✈️", "🏠", "🚗", "💍", "🎓", "🏖️")
  }
}
Use para: "quero guardar", "meta de", "objetivo de", "juntar dinheiro para", "poupar para", "criar meta".

{
  "action": "list_goals"
}
Use para: "minhas metas", "como estão minhas metas", "objetivos financeiros", "quanto já juntei".

{
  "action": "add_goal_progress",
  "goal_progress": {
    "name": string (nome ou parte do nome da meta),
    "amount": number (valor a acrescentar)
  }
}
Use para: "guardei X para", "adicionei X na meta de", "coloca X na meta de", "contribuí X para".

━━━ CONTAS / RECORRÊNCIAS ━━━
{
  "action": "create_bill",
  "bill": {
    "description": string (nome da conta, ex: "Aluguel", "Conta de luz", "Netflix"),
    "amount": number,
    "due_date": "YYYY-MM-DD" (data de vencimento),
    "is_recurring": boolean (true se for mensal, semanal, anual),
    "recurrence_interval": "monthly" | "weekly" | "yearly" (só se is_recurring=true)
  }
}
Use para: "adiciona conta", "cadastra boleto", "lança conta de", "todo mês pago", "mensalidade", "assinatura", "aluguel".

{
  "action": "list_bills"
}
Use para: "minhas contas", "contas a pagar", "o que vence", "boletos pendentes", "próximas contas".

{
  "action": "mark_bill_paid",
  "bill_name": string (nome ou parte do nome da conta paga)
}
Use para: "paguei a conta de", "quitei o boleto de", "marquei como pago", "já paguei".
ATENÇÃO: Diferença crucial:
- "paguei a conta de luz" → mark_bill_paid (marca uma conta cadastrada como paga)
- "paguei 150 de luz" → register_transaction (registra uma despesa nova)

━━━ LISTA DE COMPRAS ━━━
{
  "action": "create_shopping_list",
  "shopping_list": {
    "name": string (nome da lista, ex: "Mercado", "Farmácia", "Compras da semana"),
    "category": string (opcional, categoria de gasto)
  }
}
Use para: "vou ao mercado", "cria uma lista de compras", "compras para a semana", "lista de farmácia".

{
  "action": "add_shopping_items",
  "shopping_items": [
    { "name": string, "quantity": number (opcional), "unit": string (opcional, ex: "kg", "L") }
  ]
}
Use para: "adiciona pão, leite, ovos", "compra 2kg de frango, 1L de leite".

{
  "action": "view_shopping_list"
}
Use para: "minhas compras", "lista de compras", "o que eu vou comprar", "mostra a lista".

{
  "action": "estimate_list_cost"
}
Use para: "quanto vai custar", "estima o custo", "quanto gasto nessa lista".

{
  "action": "mark_shopping_item",
  "shopping_item_names": ["arroz", "feijão"]
}
Use quando o usuário avisa que comprou/pegou um ou mais itens ESPECÍFICOS da lista: "comprei o arroz", "já peguei o feijão e o leite", "marca o detergente como comprado", "coloquei o pão no carrinho". Extraia só o nome dos itens.

{
  "action": "unmark_shopping_item",
  "shopping_item_names": ["arroz"]
}
Use quando o usuário quer DESMARCAR um item (reverter): "ainda não comprei o arroz", "desmarca o feijão", "marquei o leite errado", "tira o pão da lista de comprados".

{
  "action": "complete_shopping_list"
}
Use para: "comprei tudo", "finalizei a compra", "completei a lista", "terminei as compras". Apenas quando se refere à lista TODA, sem citar item específico.

━━━ CONSULTORIA FINANCEIRA ━━━
{
  "action": "ask_advice"
}
Use para: "como estou financeiramente", "analisa meus gastos", "me dá um conselho", "estou gastando muito", "como economizar", "me ajuda a economizar", "devo cortar gastos", "vale a pena", "o que você acha".

{
  "action": "financial_diagnosis"
}
Use para: "quero organizar minha vida financeira", "me ajuda a organizar", "quero um plano financeiro", "quero sair das dívidas", "quero começar a poupar", "não sei controlar meu dinheiro", "preciso de ajuda financeira", "diagnóstico financeiro".

{
  "action": "economy_suggestions"
}
Use para: "me dá dica de economia", "como economizar", "onde cortei gastos", "onde consigo poupar", "como reduzir gastos", "dê um conselho de economia".

{
  "action": "simulate_goal",
  "goal_name": string (nome ou parte do nome da meta)
}
Use para: "quando atinjo minha meta", "quanto tempo falta", "simula minha meta", "em quanto tempo consigo", "quando consigo juntar para".

━━━ DESCONHECIDO ━━━
{
  "action": "unknown"
}

━━━ REGRAS GERAIS ━━━
- Para datas relativas: hoje=${today}
- "quinta às 8h" → calcule o próximo dia da semana
- "amanhã às 14h" → ${today.slice(0,7)}-??T14:00:00 (calcule)
- Sempre use exatamente uma das categorias para transações: ${categoryList}

━━━ EXEMPLOS ━━━
- "Gastei 45 no mercado" → register_transaction, expense, Alimentação
- "Recebi 3500 de salário" → register_transaction, income, Salário
- "Quanto gastei este mês?" → query_report
- "Cancela o mercado" → delete_transaction
- "Dentista sexta às 10h" → create_appointment
- "Quero juntar 10000 para viagem em dezembro" → create_goal
- "Guardei 500 para a viagem" → add_goal_progress
- "Minhas metas" → list_goals
- "Cadastra aluguel 1500 todo mês no dia 5" → create_bill, monthly
- "Contas a pagar" → list_bills
- "Paguei a conta de luz" → mark_bill_paid
- "Como estou financeiramente?" → ask_advice
- "Me ajuda a organizar minha vida financeira" → financial_diagnosis
- "Me dá uma dica de economia" → economy_suggestions
- "Quando atinjo minha meta de viagem?" → simulate_goal, goal_name: "viagem"
- "Vou ao mercado" → create_shopping_list, shopping_list: {name: "Mercado", category: "Alimentação"}
- "Adiciona pão, leite, ovos" → add_shopping_items, shopping_items: [{name: "Pão"}, {name: "Leite"}, {name: "Ovos"}]
- "Minhas compras" → view_shopping_list
- "Quanto vai custar?" → estimate_list_cost
- "Comprei o arroz" → mark_shopping_item, shopping_item_names: ["arroz"]
- "Já peguei o leite e o pão" → mark_shopping_item, shopping_item_names: ["leite", "pão"]
- "Ainda não comprei o arroz" → unmark_shopping_item, shopping_item_names: ["arroz"]
- "Comprei tudo" → complete_shopping_list

Responda APENAS com o JSON, sem texto adicional, sem markdown.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    try {
      const raw = response.content[0].type === 'text' ? response.content[0].text : '';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      return JSON.parse(text) as MessageIntent;
    } catch {
      this.logger.error('Failed to parse AI response', response.content);
      return { action: 'unknown' };
    }
  }

  async transcribeAudio(base64: string): Promise<string | null> {
    if (!this.openai) return null;
    try {
      const buffer = Buffer.from(base64, 'base64');
      const file = await toFile(buffer, 'audio.ogg', { type: 'audio/ogg' });

      const result = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'pt',
      });

      return result.text?.trim() || null;
    } catch (err) {
      this.logger.error('Whisper transcription failed', err);
      return null;
    }
  }

  async generateReportResponse(query: string, data: any): Promise<string> {
    if (!this.anthropic) return 'IA não configurada.';

    const today = dayjs().format('DD/MM/YYYY');

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: `Você é a Finora, uma assistente financeira pessoal simpática e direta. Hoje é ${today}.

Responda em português brasileiro, use emojis para deixar visual e agradável.
Formate valores em R$ com vírgula (ex: R$ 1.250,00).
Seja objetivo: máximo 15 linhas. Não repita dados desnecessários.

Ao responder sobre relatórios, siga este estilo:

📊 *Relatório de [período]*

💰 Receitas: R$ X
💸 Gastos: R$ X
✅/❌ Saldo: R$ X (positivo/negativo)

🏆 Maior gasto: [categoria] — R$ X
📈 Comparado ao mês anterior: [melhor/pior X%]

Se o usuário perguntar sobre uma categoria específica (ex: "mercado", "alimentação", "saúde"):
- Use o campo "transactionsByCategory" nos dados para encontrar EXATAMENTE essa categoria
- Liste os gastos individuais daquela categoria (descrição + valor)
- Mostre o total daquela categoria
- NÃO misture com outras categorias

Se perguntar sobre o mês geral, use os totais de "currentMonth".
Se perguntar se está positivo, responda claramente se sim ou não e por quanto.
Se perguntar resumo do dia, mostre só o de hoje.
Termine sempre com uma dica ou encorajamento curto.`,
      messages: [
        {
          role: 'user',
          content: `Pergunta do usuário: "${query}"\n\nDados financeiros:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  // ── Gera plano de orçamento personalizado (50/30/20 adaptado) ────────────
  async generateBudgetPlan(
    income: number,
    fixedExpenses: string,
    debts: string,
    mainGoal: string,
  ): Promise<{ text: string; plan: Record<string, number> }> {
    if (!this.anthropic) return { text: 'IA não configurada.', plan: {} };

    const hasDebts = !['não', 'nao', 'nenhuma', 'nenhum', 'sem dívida', 'zero', 'nada'].some(w =>
      debts.toLowerCase().includes(w),
    );

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system: `Você é a Finora, consultora financeira. Crie um plano de orçamento mensal personalizado.

Retorne APENAS um JSON válido com esta estrutura:
{
  "percentages": {
    "necessidades": number,
    "dividas": number,
    "qualidade_vida": number,
    "futuro": number
  },
  "breakdown": {
    "moradia": number,
    "alimentacao": number,
    "transporte": number,
    "saude": number,
    "dividas": number,
    "lazer": number,
    "roupas": number,
    "reserva": number,
    "investimentos": number
  },
  "message": string (plano formatado em texto com emojis, WhatsApp markdown, máx 30 linhas)
}

REGRAS:
- Se tem dívidas: aumente "futuro" para pagar dívidas (40-50%), reduza lazer para 10-15%
- Sem dívidas: regra 50/30/20 clássica adaptada aos gastos fixos informados
- Os valores em "breakdown" devem somar exatamente a renda informada
- Use *texto* para negrito no WhatsApp
- Formate valores em R$ com vírgula
- Seja específico com os valores da pessoa, não genérico`,
      messages: [{
        role: 'user',
        content: `Renda mensal líquida: R$ ${income.toFixed(2)}
Gastos fixos declarados: ${fixedExpenses}
Dívidas: ${debts}
Objetivo principal: ${mainGoal}
Tem dívidas: ${hasDebts ? 'Sim' : 'Não'}`,
      }],
    });

    try {
      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(text);
      return {
        text: parsed.message || '',
        plan: parsed.breakdown || {},
      };
    } catch {
      // Fallback plan simples
      const necessidades = income * 0.5;
      const futuro = income * 0.2;
      const qualidade = income * 0.3;
      const text =
        `💰 *Seu Plano Mensal — R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n` +
        `🏠 *Necessidades (50%) — R$ ${necessidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n` +
        `├ Moradia, alimentação, transporte, saúde\n\n` +
        `🎯 *Futuro (20%) — R$ ${futuro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n` +
        `├ Reserva de emergência e investimentos\n\n` +
        `🎉 *Qualidade de vida (30%) — R$ ${qualidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n` +
        `└ Lazer, roupas, restaurantes`;
      return { text, plan: { reserva: futuro, lazer: qualidade } };
    }
  }

  // ── Compara gastos reais com o plano orçamentário ─────────────────────────
  async generateBudgetComparison(
    reportData: any,
    budgetPlan: Record<string, number>,
    income: number,
  ): Promise<string> {
    if (!this.anthropic) return 'IA não configurada.';

    const categoryMap: Record<string, string> = {
      'Alimentação': 'alimentacao',
      'Transporte': 'transporte',
      'Moradia': 'moradia',
      'Saúde': 'saude',
      'Lazer': 'lazer',
      'Vestuário': 'roupas',
    };

    const realSpending = reportData.currentMonth?.topCategories || [];
    const spendingLines = realSpending.map((c: any) => {
      const planKey = categoryMap[c.name];
      const planned = planKey ? (budgetPlan[planKey] || 0) : 0;
      const diff = c.total - planned;
      const status = planned === 0 ? '' : diff > 0 ? `⚠️ +R$ ${diff.toFixed(2)} acima` : `✅ R$ ${Math.abs(diff).toFixed(2)} abaixo`;
      return `${c.name}: R$ ${c.total.toFixed(2)}${planned > 0 ? ` / planejado R$ ${planned.toFixed(2)} ${status}` : ''}`;
    }).join('\n');

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: `Você é a Finora. Analise o desempenho orçamentário do cliente e dê um feedback direto e útil. Máx 15 linhas. Use emojis e *negrito* WhatsApp.`,
      messages: [{
        role: 'user',
        content: `Renda: R$ ${income.toFixed(2)}
Total gasto no mês: R$ ${reportData.currentMonth?.expense?.toFixed(2) || '0'}
Saldo: R$ ${reportData.currentMonth?.balance?.toFixed(2) || '0'}

Gastos por categoria (real vs planejado):
${spendingLines || 'Sem gastos registrados ainda'}`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  // ── Gera sugestões de economia baseado nos gastos ────────────────────────
  async generateEconomySuggestions(topSpendersSummary: string, monthData: any, budgetPlan: any): Promise<string> {
    if (!this.anthropic) return 'IA não configurada.';

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: `Você é a Finora. Analise os gastos do cliente e dê 3-4 sugestões CONCRETAS e práticas de economia. Use emojis. Máx 12 linhas. Seja direto.

Exemplos de sugestões:
- "Você gasta R$ 800/mês em restaurantes. Se fazer a metade em casa, economiza R$ 400!"
- "Internet, celular e TV custam juntos R$ 250. Renegocie ou troque de plano."
- "Streaming: você tem 4 assinaturas. Cancele 2 que não usa."`,
      messages: [{
        role: 'user',
        content: `Gastos principais este mês:\n${topSpendersSummary}\n\nTotal gasto: R$ ${monthData?.expense?.toFixed(2) || '0'}\nReceita: R$ ${monthData?.income?.toFixed(2) || '0'}\nSaldo: R$ ${(monthData?.income - monthData?.expense)?.toFixed(2) || '0'}`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  // ── Estima preço dos itens da lista baseado em histórico ────────────────
  async estimateShoppingItems(
    items: Array<{ name: string; quantity?: number; unit?: string }>,
    recentTransactions: any[],
  ): Promise<Array<{ name: string; quantity: number; unit: string; estimated_price: number }>> {
    if (!this.anthropic) {
      return items.map((item) => ({
        ...item,
        quantity: item.quantity || 1,
        unit: item.unit || 'un',
        estimated_price: 0,
      }));
    }

    const transactionsSummary = recentTransactions
      .slice(0, 50)
      .map((t: any) => `${t.description}: R$ ${t.amount.toFixed(2)}`)
      .join('\n');

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        system: `Você é assistente financeiro. Baseado no histórico de gastos, estime o preço atual de cada item da lista.

Retorne APENAS um JSON com esta estrutura:
{
  "items": [
    {
      "name": string,
      "quantity": number,
      "unit": string,
      "estimated_price": number (preço unitário estimado em reais)
    }
  ]
}

REGRAS:
- Use o histórico de transações para estimar preços realistas
- Se o item não aparece no histórico, use preços atuais de mercado brasileiros
- Preço unitário, NÃO total
- Formate para 2 casas decimais
- Unidade padrão: "un" para unidades, "kg" para peso, "L" para líquido`,
        messages: [{
          role: 'user',
          content: `Itens da lista: ${JSON.stringify(items)}\n\nHistórico de gastos recentes:\n${transactionsSummary}`,
        }],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(text);
      return parsed.items || items.map((item) => ({
        ...item,
        quantity: item.quantity || 1,
        unit: item.unit || 'un',
        estimated_price: 0,
      }));
    } catch {
      return items.map((item) => ({
        ...item,
        quantity: item.quantity || 1,
        unit: item.unit || 'un',
        estimated_price: 0,
      }));
    }
  }

  // ── Analisa imagem/PDF de comprovante via Claude Vision ─────────────────
  async analyzeReceiptImage(base64: string, mimeType: string, categoryNames: string[]): Promise<ParsedTransaction[]> {
    if (!this.anthropic) return [];
    const today = dayjs().format('YYYY-MM-DD');
    const categoryList = categoryNames.length
      ? categoryNames.join(', ')
      : 'Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Internet/Telefone, Serviços, Salário, Freelance, Investimentos, Outros';

    // Claude Vision accepts JPEG, PNG, GIF, WEBP
    const safeMime = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
      ? mimeType
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const systemPrompt = `Você é um assistente financeiro inteligente. Analise o arquivo enviado (comprovante, recibo, extrato bancário ou nota fiscal) e extraia TODAS as transações financeiras presentes.

Hoje é ${today}.

Retorne um JSON com a seguinte estrutura:
{
  "transactions": [
    {
      "type": "expense" | "income",
      "amount": number,
      "category": string (use exatamente uma da lista: ${categoryList}),
      "description": string,
      "date": "YYYY-MM-DD"
    }
  ],
  "summary": string (resumo em português)
}

REGRAS PARA "description" (muito importante):
- Use o nome do PRODUTO ou SERVIÇO comprado, não o nome da loja
- Se houver vários itens, use o principal ou "Compras em [Loja]"
- Exemplos:
  * Nota fiscal Renner com item "Camisa" → description: "Camisa"
  * Nota fiscal iFood → description: "Delivery iFood"
  * PIX enviado para João → description: "PIX para João"
  * Fatura de internet → description: "Internet"
  * Farmácia com remédio → description: "Remédio"
  * Posto de gasolina → description: "Combustível"
  * Mercado → description: "Supermercado"

REGRAS PARA "category":
- Escolha com base no que foi comprado, não onde foi comprado
- Lojas de roupa → Vestuário
- Supermercado/feira → Alimentação
- Farmácia → Saúde
- Posto → Transporte
- Restaurante/iFood → Alimentação
- Netflix/Spotify → Lazer
- Internet/telefone → Internet/Telefone

OUTRAS REGRAS:
- Extraia TODAS as transações visíveis
- Se não houver data, use hoje (${today})
- PIX enviado/débito → "expense", PIX recebido/crédito → "income"
- Nota fiscal → sempre "expense"
- Extrato → cada linha vira um item separado

Responda APENAS com o JSON, sem texto adicional, sem markdown.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: safeMime, data: base64 },
              },
            ],
          },
        ],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(text);
      this.logger.log(`[analyzeReceiptImage] found ${parsed.transactions?.length ?? 0} transactions, summary: ${parsed.summary}`);
      return parsed.transactions || [];
    } catch (err) {
      this.logger.error('analyzeReceiptImage failed', err?.message);
      return [];
    }
  }

  // ── Gera comentário consultor após registrar uma transação ───────────────
  async generateTransactionComment(
    transaction: ParsedTransaction,
    categoryMonthTotal: number,
    lastMonthCategoryTotal: number,
    monthIncome: number,
    goals: any[],
  ): Promise<string | null> {
    if (!this.anthropic) return null;
    try {
      const goalsSummary = goals.length > 0
        ? goals.map((g: any) => {
            const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            return `${g.name}: ${pct}% (R$ ${Number(g.current_amount).toFixed(2)} de R$ ${Number(g.target_amount).toFixed(2)})`;
          }).join(', ')
        : 'nenhuma meta cadastrada';

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 120,
        system: `Você é a Finora, consultora financeira pessoal. Após registrar um gasto, gere UM insight curto (máx 2 linhas) que ajude o cliente a entender sua situação. Use emoji. Seja direta e útil.

Não confirme o registro (já foi confirmado). Dê perspectiva financeira real.
Se não houver nada relevante a dizer, retorne exatamente: SKIP

Exemplos:
- "💡 Já são R$ 620 em Alimentação este mês — 40% acima do mês passado. Considere cozinhar mais em casa!"
- "✅ Alimentação controlada! Abaixo do mês anterior. Continue assim 💪"
- "⚠️ Com esse gasto, você já comprometeu 35% da sua renda do mês."
- "🎯 Lembra da sua meta de viagem? Cada economizado conta!"`,
        messages: [{
          role: 'user',
          content: `Gasto registrado: ${transaction.description} — R$ ${transaction.amount.toFixed(2)} (${transaction.category})
Total em ${transaction.category} este mês: R$ ${categoryMonthTotal.toFixed(2)}
Total em ${transaction.category} mês passado: R$ ${lastMonthCategoryTotal.toFixed(2)}
Receita do mês: R$ ${monthIncome.toFixed(2)}
Metas: ${goalsSummary}`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      return text && text !== 'SKIP' ? text : null;
    } catch {
      return null;
    }
  }

  // ── Gera resposta de consultoria financeira completa ─────────────────────
  async generateAdvisorResponse(query: string, reportData: any, goals: any[], bills: any[]): Promise<string> {
    if (!this.anthropic) return 'IA não configurada.';

    const today = dayjs().format('DD/MM/YYYY');

    const goalsSummary = goals.length > 0
      ? goals.map((g: any) => {
          const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
          return `• ${g.icon || '🎯'} ${g.name}: R$ ${Number(g.current_amount).toFixed(2)} / R$ ${Number(g.target_amount).toFixed(2)} (${pct}%)`;
        }).join('\n')
      : 'Nenhuma meta cadastrada';

    const billsSummary = bills.length > 0
      ? bills.map((b: any) => `• ${b.description}: R$ ${Number(b.amount).toFixed(2)} vence ${b.due_date}`).join('\n')
      : 'Nenhuma conta pendente';

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: `Você é a Finora, consultora financeira pessoal. Hoje é ${today}.

Analise os dados financeiros do cliente e dê uma consultoria real, personalizada e acionável.
Responda em português brasileiro, use emojis. Máximo 20 linhas.

Estrutura da resposta:
1. Diagnóstico rápido (2-3 linhas sobre situação atual)
2. Pontos de atenção (o que precisa melhorar)
3. Recomendações concretas (3 ações específicas)
4. Frase motivacional curta

Formate valores em R$ com vírgula. Seja honesta mas encorajadora.`,
      messages: [{
        role: 'user',
        content: `Pergunta do cliente: "${query}"

DADOS FINANCEIROS:
Este mês:
- Receitas: R$ ${reportData.currentMonth?.income?.toFixed(2) || '0,00'}
- Gastos: R$ ${reportData.currentMonth?.expense?.toFixed(2) || '0,00'}
- Saldo: R$ ${reportData.currentMonth?.balance?.toFixed(2) || '0,00'}
- Top categorias: ${reportData.currentMonth?.topCategories?.map((c: any) => `${c.name} R$ ${c.total.toFixed(2)}`).join(', ') || 'nenhuma'}

Comparação com mês anterior:
- Gastos antes: R$ ${reportData.lastMonth?.expense?.toFixed(2) || '0,00'}
- Variação: ${reportData.comparison?.expenseDiffPercent || 0}%

METAS:
${goalsSummary}

CONTAS PENDENTES:
${billsSummary}`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  // ── Analisa texto extraído de PDF ou planilha ─────────────────────────────
  async analyzeDocumentText(text: string, filename: string, categoryNames: string[]): Promise<{ transactions: ParsedTransaction[]; summary: string }> {
    if (!this.anthropic) return { transactions: [], summary: 'IA não configurada.' };
    const today = dayjs().format('YYYY-MM-DD');
    const categoryList = categoryNames.length
      ? categoryNames.join(', ')
      : 'Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Internet/Telefone, Serviços, Salário, Freelance, Investimentos, Outros';

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 3000,
        system: `Você é um assistente financeiro inteligente. Analise o conteúdo do arquivo "${filename}" e extraia TODAS as transações financeiras presentes.

Hoje é ${today}.

Retorne um JSON com a seguinte estrutura:
{
  "transactions": [
    {
      "type": "expense" | "income",
      "amount": number,
      "category": string (use exatamente uma da lista: ${categoryList}),
      "description": string,
      "date": "YYYY-MM-DD"
    }
  ],
  "summary": string (resumo em português, ex: "Encontrei 3 transações: R$ 86,31 em Vestuário, ...")
}

REGRAS PARA "description" (muito importante):
- Use o nome do PRODUTO ou SERVIÇO, não o nome da loja/empresa
- Exemplos:
  * Nota fiscal Renner com item "Camisa" → "Camisa"
  * Nota fiscal com produto "Tênis Nike" → "Tênis Nike"
  * PIX enviado para João → "PIX para João"
  * Fatura de internet → "Internet"
  * Farmácia com remédio → "Remédio"
  * Combustível → "Combustível"
  * Mercado sem detalhe de item → "Supermercado"
  * Extrato com descrição genérica → use a descrição do extrato
- Se houver vários itens na mesma nota, use o item principal ou "Compras em [Loja]"

REGRAS PARA "category":
- Baseie-se no que foi COMPRADO, não onde
- Loja de roupa (Renner, Zara, Riachuelo) → Vestuário
- Supermercado/feira/padaria → Alimentação
- Farmácia/hospital/médico → Saúde
- Posto de gasolina/Uber/ônibus → Transporte
- Restaurante/bar/delivery/iFood → Alimentação
- Streaming/cinema/jogo → Lazer
- Internet/telefone/plano → Internet/Telefone
- Aluguel/condomínio → Moradia

OUTRAS REGRAS:
- Extraia TODAS as transações visíveis
- Débitos/saídas/notas fiscais → "expense"
- Créditos/entradas/PIX recebido → "income"
- Ignore linhas de saldo, total e cabeçalho
- Para extratos: cada linha de transação vira um item separado

Responda APENAS com o JSON, sem texto adicional, sem markdown.`,
        messages: [
          {
            role: 'user',
            content: `Conteúdo do arquivo:\n\n${text.slice(0, 12000)}`,
          },
        ],
      });

      const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const responseText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(responseText);
      return {
        transactions: parsed.transactions || [],
        summary: parsed.summary || '',
      };
    } catch (err) {
      this.logger.error('analyzeDocumentText failed', err);
      return { transactions: [], summary: 'Erro ao analisar o documento.' };
    }
  }
}
