import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as dayjs from 'dayjs';

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface MessageIntent {
  action: 'register_transaction' | 'query_report' | 'list_bills' | 'set_goal' | 'unknown';
  transaction?: ParsedTransaction;
  query?: string;
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

Para consulta de relatório:
{
  "action": "query_report",
  "query": string (o que o usuário quer saber)
}

Para outros casos:
{
  "action": "unknown"
}

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

  async generateReportResponse(query: string, data: any): Promise<string> {
    if (!this.openai) return 'IA não configurada.';
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente financeiro amigável. Responda de forma clara, curta e em português brasileiro.
Use emojis para tornar a resposta mais visual. Formate valores em Real (R$).
Seja objetivo mas simpático.`,
        },
        {
          role: 'user',
          content: `Pergunta: ${query}\n\nDados disponíveis: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    return response.choices[0].message.content;
  }
}
