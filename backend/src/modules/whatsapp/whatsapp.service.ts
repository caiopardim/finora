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
  private readonly dashboardUrl: string;

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
    this.dashboardUrl = config.get('DASHBOARD_URL', 'https://meufinora.com.br');
  }

  async handleIncomingMessage(phone: string, message: string): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');
    this.logger.log(`Message from ${normalizedPhone}: ${message}`);

    try {
      this.logger.log(`[1] Finding user for phone ${normalizedPhone}`);
      const user = await this.users.findOrCreateByPhone(normalizedPhone);
      this.logger.log(`[2] User found: ${user?.id} — parsing message with AI`);
      const intent = await this.ai.parseMessage(message);
      this.logger.log(`[3] AI intent: ${intent.action}`);

      switch (intent.action) {
        case 'register_transaction': {
          const { transaction } = intent;
          const created = await this.transactions.create(user.id, {
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            category_name: transaction.category,
            date: transaction.date,
            source: 'whatsapp',
            raw_message: message,
          });

          const transactionId = created?.id as string;
          const verb = transaction.type === 'expense' ? 'Novo Gasto Registrado' : 'Nova Receita Registrada';
          const shortId = transactionId?.slice(-6) ?? '------';
          const formattedAmount = transaction.amount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const text =
            `✅ *${verb}!*\n\n` +
            `📝 *Descrição:* ${transaction.description}\n` +
            `🏷️ *Categoria:* ${transaction.category}\n` +
            `💸 *Valor:* R$ ${formattedAmount}\n\n` +
            `📅 *Data:* ${new Date(transaction.date + 'T12:00:00').toLocaleDateString('pt-BR')}\n` +
            `⚙️ *ID:* ${shortId}`;

          await this.sendButtons(normalizedPhone, text, transactionId, transaction.description);
          break;
        }

        case 'query_report': {
          const reportData = await this.reports.getReportData(user.id);
          const reply = await this.ai.generateReportResponse(intent.query, reportData);
          await this.sendMessage(normalizedPhone, reply);
          break;
        }

        default:
          await this.sendMessage(
            normalizedPhone,
            `🤔 Não entendi sua mensagem.\n\n` +
            `Você pode:\n` +
            `• Registrar gastos: _"Gastei R$ 50 no mercado"_\n` +
            `• Registrar receitas: _"Recebi R$ 3.500 de salário"_\n` +
            `• Consultar: _"Quanto gastei este mês?"_\n` +
            `• Ver resumo: _"Resumo do dia"_`,
          );
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
      await this.sendMessage(
        phone.replace(/\D/g, ''),
        '❌ Ocorreu um erro ao processar sua mensagem. Tente novamente.',
      );
    }
  }

  async handleButtonReply(phone: string, buttonId: string): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');
    this.logger.log(`Button reply from ${normalizedPhone}: ${buttonId}`);

    try {
      if (buttonId.startsWith('delete_')) {
        const transactionId = buttonId.replace('delete_', '');
        const user = await this.users.findOrCreateByPhone(normalizedPhone);

        // Fetch transaction to get description before deleting
        const transaction = await this.transactions.findOne(user.id, transactionId).catch(() => null);
        const description = transaction?.description ?? 'Transação';

        await this.transactions.remove(user.id, transactionId);

        await this.sendMessage(
          normalizedPhone,
          `❌ *${description}*\n\nExcluído com Sucesso!`,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling button reply: ${error.message}`, error.stack);
      await this.sendMessage(normalizedPhone, '❌ Não foi possível processar a ação. Tente novamente.');
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

  async sendButtons(phone: string, text: string, transactionId: string, description: string): Promise<void> {
    try {
      await axios.post(
        `${this.evolutionUrl}/message/sendButtons/${this.instance}`,
        {
          number: `${phone}@s.whatsapp.net`,
          title: 'Finora',
          description: text,
          footer: 'meufinora.com.br',
          buttons: [
            {
              type: 'reply',
              displayText: '✏️ Editar',
              id: `edit_${transactionId}`,
            },
            {
              type: 'reply',
              displayText: '🗑️ Excluir',
              id: `delete_${transactionId}`,
            },
          ],
        },
        { headers: { apikey: this.evolutionKey } },
      );
    } catch (error) {
      this.logger.error(`Failed to send buttons message (400): ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      // Fallback to plain text with link
      await this.sendMessage(phone, text + `\n\n✏️ Editar: ${this.dashboardUrl}/dashboard/transactions\n🗑️ Para excluir, responda: *excluir ${transactionId.slice(-6)}*`);
    }
  }
}
