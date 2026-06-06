import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiService } from './ai.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly evolutionUrl: string;
  private readonly evolutionKey: string;
  private readonly instance: string;

  constructor(
    private config: ConfigService,
    private ai: AiService,
    private transactions: TransactionsService,
    private users: UsersService,
    private reports: ReportsService,
  ) {
    this.evolutionUrl = config.get('EVOLUTION_API_URL');
    this.evolutionKey = config.get('EVOLUTION_API_KEY');
    this.instance = config.get('EVOLUTION_INSTANCE', 'finora');
  }

  async handleIncomingMessage(phone: string, message: string): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');
    this.logger.log(`Message from ${normalizedPhone}: ${message}`);

    try {
      // Find or create user by phone
      const user = await this.users.findOrCreateByPhone(normalizedPhone);

      // Parse message intent with AI
      const intent = await this.ai.parseMessage(message);

      let reply: string;

      switch (intent.action) {
        case 'register_transaction': {
          const { transaction } = intent;
          await this.transactions.create(user.id, {
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            category_name: transaction.category,
            date: transaction.date,
            source: 'whatsapp',
            raw_message: message,
          });

          const emoji = transaction.type === 'expense' ? '💸' : '💰';
          const verb = transaction.type === 'expense' ? 'Despesa' : 'Receita';
          reply =
            `${emoji} *${verb} registrada!*\n\n` +
            `📝 ${transaction.description}\n` +
            `💵 R$ ${transaction.amount.toFixed(2).replace('.', ',')}\n` +
            `🏷️ ${transaction.category}\n` +
            `📅 ${new Date(transaction.date + 'T12:00:00').toLocaleDateString('pt-BR')}\n\n` +
            `_Visualize no dashboard: finora.app/dashboard_`;
          break;
        }

        case 'query_report': {
          const reportData = await this.reports.getReportData(user.id);
          reply = await this.ai.generateReportResponse(intent.query, reportData);
          break;
        }

        default:
          reply =
            `🤔 Não entendi sua mensagem.\n\n` +
            `Você pode:\n` +
            `• Registrar gastos: _"Gastei R$ 50 no mercado"_\n` +
            `• Registrar receitas: _"Recebi R$ 3.500 de salário"_\n` +
            `• Consultar: _"Quanto gastei este mês?"_\n` +
            `• Ver resumo: _"Resumo do dia"_`;
      }

      await this.sendMessage(normalizedPhone, reply);
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
      await this.sendMessage(
        normalizedPhone,
        '❌ Ocorreu um erro ao processar sua mensagem. Tente novamente.',
      );
    }
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    try {
      await axios.post(
        `${this.evolutionUrl}/message/sendText/${this.instance}`,
        { number: `${phone}@s.whatsapp.net`, text: message },
        { headers: { apikey: this.evolutionKey } },
      );
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }
}
