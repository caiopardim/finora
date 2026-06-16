import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiService } from './ai.service';
import { BudgetAlertsService } from './budget-alerts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { ReportsService } from '../reports/reports.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CategoriesService } from '../categories/categories.service';
import * as dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
dayjs.locale('pt-br');

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly evolutionUrl: string;
  private readonly evolutionKey: string;
  private readonly instance: string;
  private readonly dashboardUrl: string;
  // Pending delete confirmations: phone -> { txId, description, amount, date }
  private readonly pendingDeletes = new Map<string, { txId: string; description: string; amount: number; date: string }>();
  // Pending duplicate confirmations: phone -> pending transaction data
  private readonly pendingDuplicates = new Map<string, { type: string; amount: number; description: string; category: string; date: string; duplicateDesc: string; duplicateAgo: string }>();

  constructor(
    private config: ConfigService,
    private ai: AiService,
    @Inject(forwardRef(() => BudgetAlertsService)) private budgetAlerts: BudgetAlertsService,
    private transactions: TransactionsService,
    private users: UsersService,
    private reports: ReportsService,
    private categories: CategoriesService,
    @Inject(forwardRef(() => AppointmentsService)) private appointments: AppointmentsService,
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
      const user = await this.users.findByPhone(normalizedPhone);

      // Paywall gate: no account or unpaid account
      if (!user) {
        await this.sendMessage(
          normalizedPhone,
          `🐷 *Olá! Eu sou a Finora!*\n\n` +
          `Ajudo você a controlar suas finanças direto pelo WhatsApp — sem planilhas, sem complicação.\n\n` +
          `✅ Registre gastos e receitas por mensagem\n` +
          `✅ Acompanhe tudo no dashboard\n` +
          `✅ Relatórios inteligentes com IA\n\n` +
          `Para começar, crie sua conta gratuitamente:\n` +
          `👉 *${this.dashboardUrl}*`,
        );
        return;
      }

      if (!user.paid) {
        await this.sendMessage(
          normalizedPhone,
          `🔒 *Sua assinatura Finora está inativa.*\n\n` +
          `Para voltar a registrar seus gastos pelo WhatsApp, reative seu plano:\n` +
          `👉 *${this.dashboardUrl}/dashboard/plano*\n\n` +
          `Qualquer dúvida, é só responder aqui! 😊`,
        );
        return;
      }

      // Check if user has a pending duplicate confirmation
      const pendingDup = this.pendingDuplicates.get(normalizedPhone);
      if (pendingDup) {
        const msg = message.trim().toLowerCase();
        if (msg === 'sim' || msg === 'confirmar' || msg === 'confirma' || msg === 's') {
          this.pendingDuplicates.delete(normalizedPhone);
          const created = await this.transactions.create(user.id, {
            type: pendingDup.type as any,
            amount: pendingDup.amount,
            description: pendingDup.description,
            category_name: pendingDup.category,
            date: pendingDup.date,
            source: 'whatsapp',
            raw_message: message,
          });
          const fmt = pendingDup.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const shortId = (created?.id as string)?.slice(-6) ?? '------';
          const verb = pendingDup.type === 'expense' ? 'Gasto' : 'Receita';
          await this.sendMessage(normalizedPhone,
            `✅ *${verb} registrado!*\n\n` +
            `📝 *${pendingDup.description}*\n` +
            `🏷️ *${pendingDup.category}*\n` +
            `💸 *R$ ${fmt}*\n` +
            `⚙️ ID: ${shortId}`,
          );
          this.budgetAlerts.checkAndNotify(user.id).catch(() => {});
          return;
        } else if (msg === 'não' || msg === 'nao' || msg === 'n' || msg === 'cancelar' || msg === 'desistir') {
          this.pendingDuplicates.delete(normalizedPhone);
          await this.sendMessage(normalizedPhone, `↩️ Ok! Lançamento cancelado.`);
          return;
        } else {
          this.pendingDuplicates.delete(normalizedPhone);
        }
      }

      // Check if user has a pending delete confirmation
      const pending = this.pendingDeletes.get(normalizedPhone);
      if (pending) {
        const msg = message.trim().toLowerCase();
        if (msg === 'sim' || msg === 'confirmar' || msg === 'confirma' || msg === 's') {
          this.pendingDeletes.delete(normalizedPhone);
          await this.transactions.remove(user.id, pending.txId);
          const fmtAmt = pending.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          await this.sendMessage(normalizedPhone, `✅ *Transação excluída!*\n\n📝 *${pending.description}*\n💸 R$ ${fmtAmt}\n📅 ${new Date(pending.date + 'T12:00:00').toLocaleDateString('pt-BR')}`);
          return;
        } else if (msg === 'não' || msg === 'nao' || msg === 'n' || msg === 'cancelar') {
          this.pendingDeletes.delete(normalizedPhone);
          await this.sendMessage(normalizedPhone, `↩️ Cancelado! A transação *${pending.description}* foi mantida.`);
          return;
        } else {
          // Clear pending and continue processing as new message
          this.pendingDeletes.delete(normalizedPhone);
        }
      }

      this.logger.log(`[2] User found: ${user?.id} — parsing message with AI`);
      const userCategories = await this.categories.findAll(user.id).catch(() => []);
      const categoryNames = userCategories.map((c: any) => c.name);
      const intent = await this.ai.parseMessage(message, categoryNames);
      this.logger.log(`[3] AI intent: ${intent.action}`);

      switch (intent.action) {
        case 'register_transaction': {
          const { transaction } = intent;
          this.logger.log(`[4] Creating transaction for user ${user.id}`);

          // ── Duplicate detection: check for same amount+type in last 3h ──
          const duplicate = await this.transactions.findRecentDuplicate(user.id, transaction.type, transaction.amount, 3);
          if (duplicate) {
            const ago = (() => {
              const diffMs = Date.now() - new Date(duplicate.created_at).getTime();
              const mins = Math.round(diffMs / 60000);
              if (mins < 60) return `${mins} minuto${mins !== 1 ? 's' : ''} atrás`;
              const hrs = Math.round(diffMs / 3600000);
              return `${hrs} hora${hrs !== 1 ? 's' : ''} atrás`;
            })();
            const fmt = transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            this.pendingDuplicates.set(normalizedPhone, {
              type: transaction.type,
              amount: transaction.amount,
              description: transaction.description,
              category: transaction.category,
              date: transaction.date,
              duplicateDesc: duplicate.description,
              duplicateAgo: ago,
            });
            await this.sendMessage(normalizedPhone,
              `⚠️ *Possível lançamento duplicado!*\n\n` +
              `${ago} você registrou:\n` +
              `📝 *${duplicate.description}* — R$ ${fmt}\n\n` +
              `Quer registrar novamente?\n\n` +
              `✅ Responda *SIM* para confirmar\n` +
              `❌ Responda *NÃO* para cancelar`,
            );
            return;
          }

          const created = await this.transactions.create(user.id, {
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            category_name: transaction.category,
            date: transaction.date,
            source: 'whatsapp',
            raw_message: message,
          });
          this.logger.log(`[5] Transaction created: ${created?.id}`);

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

          this.logger.log(`[6] Sending message to ${normalizedPhone}`);
          await this.sendMessage(normalizedPhone, text);
          this.logger.log(`[7] Done`);
          // Check budget thresholds after registering an expense
          if (transaction.type === 'expense') {
            this.budgetAlerts.checkAndNotify(user.id).catch(() => {});
          }
          break;
        }

        case 'query_report': {
          const reportData = await this.reports.getReportData(user.id);
          const reply = await this.ai.generateReportResponse(intent.query, reportData);
          await this.sendMessage(normalizedPhone, reply);
          break;
        }

        case 'delete_transaction': {
          const { delete: del } = intent;
          if (!del?.description) {
            await this.sendMessage(normalizedPhone, `❓ Qual transação você quer excluir? Me diga o nome ou valor, ex:\n_"Cancela o mercado"_ ou _"Apaga o gasto de R$ 50"_`);
            break;
          }
          const tx = await this.transactions.findRecentByDescription(user.id, del.description, del.amount);
          if (!tx) {
            await this.sendMessage(normalizedPhone, `❌ Não encontrei nenhuma transação com *"${del.description}"*.\n\nVerifique no dashboard ou tente com outro termo.`);
            break;
          }
          const fmtAmt = Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const fmtDate = new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR');
          // Store pending delete and ask for confirmation
          this.pendingDeletes.set(normalizedPhone, { txId: tx.id, description: tx.description, amount: Number(tx.amount), date: tx.date });
          await this.sendMessage(normalizedPhone, `⚠️ *Confirmar exclusão?*\n\n📝 *${tx.description}*\n💸 R$ ${fmtAmt}\n📅 ${fmtDate}\n\nResponda *sim* para confirmar ou *não* para cancelar.`);
          break;
        }

        case 'create_appointment': {
          const { appointment } = intent;
          const created = await this.appointments.create(user.id, {
            title: appointment.title,
            description: appointment.description,
            scheduledAt: appointment.scheduledAt,
          });

          const date = dayjs(appointment.scheduledAt);
          const dateStr = date.locale('pt-br').format('dddd, DD/MM/YYYY');
          const timeStr = date.format('HH:mm');

          await this.sendMessage(
            normalizedPhone,
            `📅 *Compromisso agendado!*\n\n` +
            `📌 *${appointment.title}*\n` +
            `🗓️ *${dateStr}*\n` +
            `🕐 *às ${timeStr}*\n` +
            (appointment.description ? `📝 ${appointment.description}\n` : '') +
            `\n✅ Vou te lembrar 1 dia antes e 1 hora antes! 🔔`,
          );
          break;
        }

        case 'list_appointments': {
          const upcoming = await this.appointments.listUpcoming(user.id);

          if (upcoming.length === 0) {
            await this.sendMessage(normalizedPhone, `📅 Você não tem compromissos agendados.\n\nPara agendar, diga algo como:\n_"Agende dentista quinta às 10h"_`);
            break;
          }

          const lines = upcoming.map((a, i) => {
            const date = dayjs(a.scheduled_at);
            return `${i + 1}. 📌 *${a.title}*\n   🕐 ${date.format('DD/MM/YYYY')} às ${date.format('HH:mm')}`;
          });

          await this.sendMessage(
            normalizedPhone,
            `📅 *Seus próximos compromissos:*\n\n${lines.join('\n\n')}`,
          );
          break;
        }

        default:
          await this.sendMessage(
            normalizedPhone,
            `Hmm, não entendi muito bem o que você quis dizer. Lembre-se que eu sou um assistente financeiro e posso te ajudar a registrar seus gastos, consultar parcelas, ver seus relatórios e cuidar da sua agenda. Como posso te ajudar com isso? 😊`,
          );
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
      await this.sendMessage(
        phone.replace(/\D/g, ''),
        `Hmm, não entendi muito bem o que você quis dizer. Lembre-se que eu sou um assistente financeiro e posso te ajudar a registrar seus gastos, consultar parcelas, ver seus relatórios e cuidar da sua agenda. Como posso te ajudar com isso? 😊`,
      );
    }
  }

  async handleDeleteCommand(phone: string, shortId: string): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');
    try {
      const user = await this.users.findByPhone(normalizedPhone);
      if (!user || !user.paid) {
        await this.sendMessage(normalizedPhone, `❌ Você não tem uma conta ativa no Finora. Acesse: *${this.dashboardUrl}*`);
        return;
      }
      const tx = await this.transactions.findByShortId(user.id, shortId);

      if (!tx) {
        await this.sendMessage(normalizedPhone, `❌ Transação *${shortId}* não encontrada.`);
        return;
      }

      await this.transactions.remove(user.id, tx.id);
      await this.sendMessage(normalizedPhone, `❌ *${tx.description}*\n\nExcluído com Sucesso!`);
    } catch (error) {
      this.logger.error(`Error handling delete command: ${error.message}`);
      await this.sendMessage(normalizedPhone, '❌ Não foi possível excluir. Tente novamente.');
    }
  }

  // ── Processa mídia: imagem de comprovante, PDF ou planilha ──────────────
  async handleMediaMessage(phone: string, data: any): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');
    try {
      const user = await this.users.findByPhone(normalizedPhone);
      if (!user) {
        await this.sendMessage(normalizedPhone, `🐷 Para usar o Finora, crie sua conta em *${this.dashboardUrl}*`);
        return;
      }
      if (!user.paid) {
        await this.sendMessage(normalizedPhone, `🔒 Sua assinatura está inativa. Reative em *${this.dashboardUrl}/dashboard/plano*`);
        return;
      }

      await this.sendMessage(normalizedPhone, '🔍 Analisando o arquivo... aguarde um momento!');

      // Detect media type
      const imageMsg  = data?.message?.imageMessage;
      const docMsg    = data?.message?.documentMessage;
      const mimeType: string = imageMsg?.mimetype || docMsg?.mimetype || 'application/octet-stream';
      const fileName: string  = docMsg?.fileName || docMsg?.title || 'documento';

      this.logger.log(`[media] user=${user.id} mimeType=${mimeType} fileName=${fileName} hasImage=${!!imageMsg} hasDoc=${!!docMsg}`);

      // Download base64 via Evolution API
      const mediaRes = await fetch(
        `${this.evolutionUrl}/chat/getBase64FromMediaMessage/${this.instance}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: this.evolutionKey },
          body: JSON.stringify({ message: { key: data?.key, message: data?.message } }),
        },
      );
      if (!mediaRes.ok) {
        await this.sendMessage(normalizedPhone, '❌ Não consegui baixar o arquivo. Tente enviar novamente.');
        return;
      }
      const mediaData = await mediaRes.json() as any;
      const base64: string = mediaData?.base64 || mediaData?.data;
      if (!base64) {
        await this.sendMessage(normalizedPhone, '❌ Não consegui ler o arquivo. Tente novamente.');
        return;
      }

      const userCategories = await this.categories.findAll(user.id).catch(() => []);
      const categoryNames  = userCategories.map((c: any) => c.name);

      let transactions: any[] = [];
      let summary = '';

      if (mimeType.startsWith('image/')) {
        // ── IMAGEM: usa GPT-4o Vision ─────────────────────────────────────
        transactions = await this.ai.analyzeReceiptImage(base64, mimeType, categoryNames);
        summary = transactions.length > 0
          ? `📷 Encontrei *${transactions.length} transação(ões)* na imagem!`
          : '📷 Não encontrei transações financeiras nesta imagem.';

      } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // ── PDF: extrai texto com pdf-parse e envia pro GPT ───────────────
        // GPT-4o Vision NÃO aceita PDF — precisa extrair texto primeiro
        try {
          const pdfParse = require('pdf-parse');
          const buffer = Buffer.from(base64, 'base64');
          const pdfData = await pdfParse(buffer);

          const rawText = pdfData.text || '';
          const text = rawText.replace(/\s+/g, ' ').trim();
          const wordCount = text.split(' ').filter((w: string) => w.length > 2).length;
          this.logger.log(`[media] pdf pages=${pdfData.numpages} text length=${text.length} words=${wordCount}`);

          if (wordCount >= 10) {
            const result = await this.ai.analyzeDocumentText(text, fileName, categoryNames);
            transactions = result.transactions;
            summary = result.summary || `📄 Encontrei *${transactions.length} transação(ões)* no PDF!`;
          } else {
            // PDF é escaneado (só imagem, sem texto) — não tem como extrair automaticamente
            await this.sendMessage(normalizedPhone,
              '📄 Este PDF parece ser escaneado (sem texto selecionável).\n\n' +
              'Tire uma *foto* do documento e me mande a imagem — assim consigo ler e importar as transações! 📷',
            );
            return;
          }
        } catch (err) {
          this.logger.error('pdf-parse error', err.message);
          await this.sendMessage(normalizedPhone,
            '❌ Não consegui ler este PDF. Tente:\n\n' +
            '📷 Tirar uma *foto* do comprovante\n' +
            '📊 Exportar o extrato em *CSV ou XLSX*',
          );
          return;
        }

      } else if (
        mimeType.includes('spreadsheet') ||
        mimeType.includes('excel') ||
        mimeType.includes('csv') ||
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.csv')
      ) {
        // ── PLANILHA: usa xlsx para extrair e GPT para interpretar ────────
        try {
          const XLSX = require('xlsx');
          const buffer = Buffer.from(base64, 'base64');
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const text = XLSX.utils.sheet_to_csv(sheet);
          const result = await this.ai.analyzeDocumentText(text, fileName, categoryNames);
          transactions = result.transactions;
          summary = result.summary || `📊 Encontrei *${transactions.length} transação(ões)* na planilha!`;
        } catch (err) {
          this.logger.error('xlsx parse failed', err);
          await this.sendMessage(normalizedPhone, '❌ Não consegui ler a planilha. Tente enviar em formato CSV ou XLSX.');
          return;
        }

      } else {
        await this.sendMessage(normalizedPhone,
          '⚠️ Formato não suportado. Você pode enviar:\n\n' +
          '📷 *Foto* de comprovante ou recibo\n' +
          '📄 *PDF* de extrato bancário\n' +
          '📊 *Planilha* CSV ou XLSX',
        );
        return;
      }

      if (transactions.length === 0) {
        await this.sendMessage(normalizedPhone, summary || '⚠️ Não encontrei transações financeiras no arquivo enviado.');
        return;
      }

      // ── Cria todas as transações extraídas ────────────────────────────────
      let created = 0;
      const lines: string[] = [];
      const today = new Date().toISOString().slice(0, 10);

      for (const tx of transactions) {
        try {
          const amt = Number(tx.amount);
          if (!amt || amt <= 0) continue;

          await this.transactions.create(user.id, {
            type: tx.type || 'expense',
            amount: amt,
            description: tx.description || 'Importado',
            category_name: tx.category || 'Outros',
            date: tx.date || today,
            source: 'whatsapp',
            raw_message: `[mídia: ${fileName || 'comprovante'}]`,
          });

          const fmt = amt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const emoji = tx.type === 'income' ? '💰' : '💸';
          lines.push(`${emoji} ${tx.description} — R$ ${fmt} (${tx.date || today})`);
          created++;
        } catch (err) {
          this.logger.error('Failed to create imported transaction', err);
        }
      }

      const preview = lines.slice(0, 10).join('\n');
      const extra = lines.length > 10 ? `\n_...e mais ${lines.length - 10} transações_` : '';

      await this.sendMessage(normalizedPhone,
        `✅ *${created} transação(ões) importada(s)!*\n\n` +
        `${preview}${extra}\n\n` +
        `📊 Veja tudo no dashboard:\n👉 *${this.dashboardUrl}/dashboard*`,
      );

      // Check budget alerts after import
      this.budgetAlerts.checkAndNotify(user.id).catch(() => {});

    } catch (err) {
      this.logger.error(`handleMediaMessage error: ${err.message}`, err.stack);
      await this.sendMessage(normalizedPhone, '❌ Erro ao processar o arquivo. Tente novamente.');
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
    const shortId = transactionId.slice(-6);
    try {
      await axios.post(
        `${this.evolutionUrl}/message/sendList/${this.instance}`,
        {
          number: phone,
          title: 'Finora',
          description: text,
          buttonText: '⚙️ Opções',
          footer: 'Use os botões abaixo para excluir ou editar',
          sections: [
            {
              title: 'Ações',
              rows: [
                {
                  title: '✏️ Editar',
                  description: 'Abrir no dashboard',
                  rowId: `edit_${transactionId}`,
                },
                {
                  title: '🗑️ Excluir',
                  description: 'Excluir esta transação',
                  rowId: `delete_${transactionId}`,
                },
              ],
            },
          ],
        },
        { headers: { apikey: this.evolutionKey } },
      );
    } catch (error) {
      this.logger.error(`List failed: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      // Fallback to plain text
      await this.sendMessage(phone, text + `\n\n✏️ Editar: ${this.dashboardUrl}/dashboard/transactions\n🗑️ Para excluir, responda: *excluir ${shortId}*`);
    }
  }
}
