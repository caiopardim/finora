import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  action: 'register_transaction' | 'query_report' | 'create_appointment' | 'list_appointments' | 'list_bills' | 'set_goal' | 'unknown';
  transaction?: ParsedTransaction;
  query?: string;
  appointment?: { title: string; description?: string; scheduledAt: string };
}

@Injectable()
export class AiService {
  private readonly openai: OpenAI | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor(private config: ConfigService) {
    const apiKey = config.get('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async parseMessage(message: string, userContext?: string): Promise<MessageIntent> {
    if (!this.openai) return { action: 'unknown' };
    const today = dayjs().format('YYYY-MM-DD');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um assistente financeiro pessoal. Hoje é ${today}.

Analise a mensagem do usuário e retorne um JSON com a seguinte estrutura:

Para registro de transação:
{
  "action": "register_transaction",
  "transaction": {
    "type": "income" | "expense",
    "amount": number,
    "category": string (uma das: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Internet/Telefone, Serviços, Salário, Freelance, Investimentos, Outros),
    "description": string (descrição curta e clara),
    "date": "YYYY-MM-DD"
  }
}

Para consulta de relatório ou pergunta sobre finanças:
{
  "action": "query_report",
  "query": string (o que o usuário quer saber, em português)
}

Considere query_report quando o usuário perguntar sobre:
- Quanto gastou (hoje, semana, mês, ano)
- Onde gastou mais / maior gasto / categoria
- Se está positivo ou negativo / saldo
- Resumo, relatório, balanço, extrato
- Comparação com mês anterior
- Contas a pagar / vencimentos
- Receitas do mês
- Qualquer pergunta sobre situação financeira

Para criar agendamento/compromisso:
{
  "action": "create_appointment",
  "appointment": {
    "title": string (nome do compromisso, ex: "Dentista", "Reunião com cliente"),
    "description": string (detalhes opcionais),
    "scheduledAt": "YYYY-MM-DDTHH:mm:00" (data e hora completa)
  }
}

Para listar agendamentos:
{
  "action": "list_appointments"
}

Para outros casos:
{
  "action": "unknown"
}

Considere create_appointment quando o usuário mencionar: agenda, agendar, compromisso, reunião, consulta, dentista, médico, lembrar, lembrete, marcar, evento.
Considere list_appointments quando perguntar sobre: "meus compromissos", "agenda", "o que tenho marcado".

Para datas relativas use hoje=${today}. Exemplos de datas:
- "quinta às 8 da manhã" → calcule o próximo dia da semana correspondente
- "amanhã às 14h" → tomorrow T14:00:00
- "semana que vem segunda" → próxima segunda-feira

Exemplos:
- "Gastei 45 no mercado" → expense, Alimentação, 45.00
- "Recebi 3500 de salário" → income, Salário, 3500.00
- "Quanto gastei este mês?" → query_report
- "Paguei 120 de internet" → expense, Internet/Telefone, 120.00`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    try {
      return JSON.parse(response.choices[0].message.content) as MessageIntent;
    } catch {
      this.logger.error('Failed to parse AI response', response.choices[0].message.content);
      return { action: 'unknown' };
    }
  }

  async transcribeAudio(base64: string): Promise<string | null> {
    if (!this.openai) return null;
    try {
      // Detect format: WhatsApp sends ogg/opus for PTT, mp4 for audio
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
    if (!this.openai) return 'IA não configurada.';

    const today = dayjs().format('DD/MM/YYYY');
    const monthName = dayjs().format('MMMM');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é a Finora, uma assistente financeira pessoal simpática e direta. Hoje é ${today}.

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

Se o usuário perguntar especificamente sobre categorias, liste as top 3-5.
Se perguntar se está positivo, responda claramente se sim ou não e por quanto.
Se perguntar resumo do dia, mostre só o de hoje.
Termine sempre com uma dica ou encorajamento curto.`,
        },
        {
          role: 'user',
          content: `Pergunta do usuário: "${query}"\n\nDados financeiros:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    return response.choices[0].message.content;
  }
}
