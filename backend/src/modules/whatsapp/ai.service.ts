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
    | 'unknown';
  transaction?: ParsedTransaction;
  query?: string;
  appointment?: { title: string; description?: string; scheduledAt: string };
  delete?: { description?: string; amount?: number; date?: string };
  goal?: { name: string; target_amount: number; deadline?: string; icon?: string };
  goal_progress?: { name: string; amount: number };
  bill?: { description: string; amount: number; due_date: string; is_recurring: boolean; recurrence_interval?: 'weekly' | 'monthly' | 'yearly' };
  bill_name?: string;
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
