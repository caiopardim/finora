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
import { GoalsService } from '../goals/goals.service';
import { BillsService } from '../bills/bills.service';
import { ShoppingListService } from '../shopping-lists/shopping-list.service';
import { isValidAmount, slidingWindow } from './agent-guards.util';
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
  // Última transação registrada por telefone (para "apaga esse", "muda o último")
  private readonly lastTransaction = new Map<string, { id: string; description: string; amount: number }>();
  // Pending duplicate confirmations: phone -> pending transaction data
  private readonly pendingDuplicates = new Map<string, { type: string; amount: number; description: string; category: string; date: string; duplicateDesc: string; duplicateAgo: string }>();
  // Onboarding flow: phone -> { stage, income?, fixedExpenses?, debts? }
  private readonly pendingOnboarding = new Map<string, { stage: 'income' | 'fixed_expenses' | 'debts' | 'main_goal'; income?: number; fixedExpenses?: string; debts?: string }>();

  // Rate limiting: telefone -> timestamps (ms) das mensagens na janela atual.
  private readonly messageTimestamps = new Map<string, number[]>();
  // Telefones já avisados que estão no limite (evita spam de aviso).
  private readonly rateLimitNotified = new Set<string>();

  /** Janela deslizante por telefone. Retorna true se excedeu o limite. */
  private isRateLimited(phone: string): boolean {
    const { recent, limited } = slidingWindow(this.messageTimestamps.get(phone) || [], Date.now());
    this.messageTimestamps.set(phone, recent);
    return limited;
  }

  /** Valor monetário válido: número finito, positivo e dentro do teto. */
  private isValidAmount(n: unknown): n is number {
    return isValidAmount(n);
  }

  constructor(
    private config: ConfigService,
    private ai: AiService,
    @Inject(forwardRef(() => BudgetAlertsService)) private budgetAlerts: BudgetAlertsService,
    private transactions: TransactionsService,
    private users: UsersService,
    private reports: ReportsService,
    private categories: CategoriesService,
    @Inject(forwardRef(() => AppointmentsService)) private appointments: AppointmentsService,
    private goals: GoalsService,
    private bills: BillsService,
    private shoppingLists: ShoppingListService,
  ) {
    this.evolutionUrl = config.get('EVOLUTION_API_URL');
    this.evolutionKey = config.get('EVOLUTION_API_KEY');
    this.instance = config.get('EVOLUTION_INSTANCE', 'finora');
    this.dashboardUrl = config.get('DASHBOARD_URL', 'https://meufinora.com.br');
  }

  async handleIncomingMessage(phone: string, message: string): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');
    this.logger.log(`Message from ${normalizedPhone}: ${message}`);

    // ── Rate limiting: protege contra flood (e custo de IA) ──
    if (this.isRateLimited(normalizedPhone)) {
      this.logger.warn(`Rate limit atingido para ${normalizedPhone}`);
      if (!this.rateLimitNotified.has(normalizedPhone)) {
        this.rateLimitNotified.add(normalizedPhone);
        await this.sendMessage(normalizedPhone,
          `⏳ Você enviou muitas mensagens em pouco tempo. Aguarde um minutinho e tente de novo. 🙏`,
        ).catch(() => {});
      }
      return;
    }
    this.rateLimitNotified.delete(normalizedPhone);

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

      const hasAccess = await this.users.hasActiveAccess(user);
      if (!hasAccess) {
        await this.sendMessage(
          normalizedPhone,
          `🔒 *Sua assinatura Finora está inativa.*\n\n` +
          `Para voltar a registrar seus gastos pelo WhatsApp, reative seu plano:\n` +
          `👉 *${this.dashboardUrl}/dashboard/plano*\n\n` +
          `Qualquer dúvida, é só responder aqui! 😊`,
        );
        return;
      }

      // ── Onboarding flow ────────────────────────────────────────────────────
      const onboarding = this.pendingOnboarding.get(normalizedPhone);
      if (onboarding) {
        const input = message.trim();
        switch (onboarding.stage) {
          case 'income': {
            const income = parseFloat(input.replace(/[^\d,]/g, '').replace(',', '.'));
            if (isNaN(income) || income <= 0) {
              await this.sendMessage(normalizedPhone, `Por favor, me diga um valor numérico. Ex: *3500*`);
              return;
            }
            this.pendingOnboarding.set(normalizedPhone, { ...onboarding, stage: 'fixed_expenses', income });
            await this.sendMessage(normalizedPhone,
              `Anotei! 💰 Renda mensal: *R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n` +
              `*2/4 — Gastos fixos*\n\n` +
              `Quais são seus principais gastos fixos mensais?\n` +
              `Ex: _"Aluguel 1200, luz 80, internet 100, faculdade 500"_`,
            );
            return;
          }
          case 'fixed_expenses': {
            this.pendingOnboarding.set(normalizedPhone, { ...onboarding, stage: 'debts', fixedExpenses: input });
            await this.sendMessage(normalizedPhone,
              `Ótimo! Registrei seus gastos fixos. 📋\n\n` +
              `*3/4 — Dívidas*\n\n` +
              `Você tem alguma dívida atualmente?\n` +
              `Ex: _"Cartão 2000, empréstimo 5000"_ ou _"Não tenho dívidas"_`,
            );
            return;
          }
          case 'debts': {
            this.pendingOnboarding.set(normalizedPhone, { ...onboarding, stage: 'main_goal', debts: input });
            await this.sendMessage(normalizedPhone,
              `Entendido! 📊\n\n` +
              `*4/4 — Objetivo principal*\n\n` +
              `Qual é seu maior objetivo financeiro agora?\n` +
              `Ex: _"Quitar dívidas"_, _"Juntar para viagem"_, _"Montar reserva de emergência"_, _"Comprar carro"_`,
            );
            return;
          }
          case 'main_goal': {
            const state = { ...onboarding };
            this.pendingOnboarding.delete(normalizedPhone);

            await this.sendMessage(normalizedPhone, `⏳ Montando seu plano financeiro personalizado...`);

            const income = state.income || 0;
            const fixedExpenses = state.fixedExpenses || 'não informado';
            const debts = state.debts || 'nenhuma';
            const mainGoal = input;
            const hasDebts = !['não', 'nao', 'nenhuma', 'nenhum', 'sem dívida', 'zero', 'nada'].some(w =>
              debts.toLowerCase().includes(w),
            );

            // Gera plano com IA
            const { text: planText, plan: budgetPlan } = await this.ai.generateBudgetPlan(
              income, fixedExpenses, debts, mainGoal,
            );

            // Salva renda e plano no perfil
            await this.users.update(user.id, {
              monthly_income: income,
              budget_plan: budgetPlan,
            }).catch(() => {});

            await this.sendMessage(normalizedPhone, planText);

            // Mensagem de próximos passos
            await this.sendMessage(normalizedPhone,
              `━━━━━━━━━━━━━━━\n\n` +
              `📌 *Próximos passos:*\n\n` +
              `1️⃣ Registre todos os seus gastos aqui — basta me mandar uma mensagem\n` +
              `2️⃣ Eu vou comparar com o plano e te avisar quando desviar\n` +
              `3️⃣ Use *"como estou no orçamento?"* a qualquer momento\n\n` +
              `Seu plano está salvo! 🎯 Bora começar? 💪`,
            );

            // Cria metas automáticas
            const emergencyTarget = income * 3;
            await this.goals.create(user.id, {
              name: 'Reserva de Emergência',
              target_amount: emergencyTarget,
              icon: '🛡️',
            }).catch(() => {});

            if (mainGoal.length > 3 && !mainGoal.toLowerCase().includes('reserva')) {
              await this.goals.create(user.id, {
                name: mainGoal.length > 40 ? mainGoal.slice(0, 40) : mainGoal,
                target_amount: income * 6,
                icon: '🎯',
              }).catch(() => {});
            }
            return;
          }
        }
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

      // ── Comando de compartilhamento: prefixo "compartilhado/casal/junto" ──
      // Marca a transação como do casal e remove o prefixo antes do parse.
      let sharedRequested = false;
      let parseText = message;
      const sharedMatch = message.match(/^\s*(compartilhad[oa]s?|casal|junto[s]?)\s*[:,-]?\s+/i);
      if (sharedMatch) {
        sharedRequested = true;
        parseText = message.slice(sharedMatch[0].length);
      }
      const householdId = sharedRequested ? await this.users.getActiveHouseholdId(user.id) : null;

      this.logger.log(`[2] User found: ${user?.id} — parsing message with AI`);
      const userCategories = await this.categories.findAll(user.id).catch(() => []);
      const categoryNames = userCategories.map((c: any) => c.name);
      const intent = await this.ai.parseMessage(parseText, categoryNames);
      this.logger.log(`[3] AI intent: ${intent.action}${sharedRequested ? ' (compartilhado)' : ''}`);

      switch (intent.action) {
        case 'register_transaction': {
          const { transaction } = intent;
          this.logger.log(`[4] Creating transaction for user ${user.id}`);

          // ── Validação de valor (evita valor negativo/absurdo do parse) ──
          if (!this.isValidAmount(transaction.amount)) {
            await this.sendMessage(normalizedPhone,
              `🤔 Não consegui identificar um valor válido nessa mensagem. ` +
              `Tente algo como _"gastei 50 no mercado"_.`,
            );
            return;
          }

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
            shared: sharedRequested && !!householdId,
            household_id: householdId,
          });
          this.logger.log(`[5] Transaction created: ${created?.id}`);
          if (created?.id) this.lastTransaction.set(normalizedPhone, { id: created.id, description: transaction.description, amount: transaction.amount });

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
            (sharedRequested && householdId ? `👫 *Compartilhado com o casal*\n` : '') +
            (sharedRequested && !householdId ? `ℹ️ _Você ainda não tem um espaço da família — lancei como pessoal. Crie em Configurações › Família._\n` : '') +
            `⚙️ *ID:* ${shortId}`;

          this.logger.log(`[6] Sending message to ${normalizedPhone}`);
          await this.sendMessage(normalizedPhone, text);
          this.logger.log(`[7] Done`);
          // Check budget thresholds after registering an expense
          if (transaction.type === 'expense') {
            this.budgetAlerts.checkAndNotify(user.id).catch(() => {});
            // Fire consultant comment + budget alert async (doesn't block the response)
            this.sendConsultorComment(user.id, normalizedPhone, transaction).catch(() => {});
            this.sendBudgetAlert(user.id, normalizedPhone, transaction).catch(() => {});
          }
          break;
        }

        case 'register_multiple': {
          const list = intent.transactions || [];
          if (list.length === 0) { break; }
          const lines: string[] = [];
          let totalExpense = 0;
          let hasExpense = false;
          for (const t of list) {
            try {
              if (!this.isValidAmount(t.amount)) {
                this.logger.warn(`[register_multiple] valor inválido ignorado: ${t.description} = ${t.amount}`);
                continue;
              }
              await this.transactions.create(user.id, {
                type: t.type,
                amount: t.amount,
                description: t.description,
                category_name: t.category,
                date: t.date,
                source: 'whatsapp',
                raw_message: message,
                shared: sharedRequested && !!householdId,
                household_id: householdId,
              });
              const emoji = t.type === 'expense' ? '💸' : '💰';
              const fmt = t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              lines.push(`${emoji} ${t.description} — R$ ${fmt} (${t.category})`);
              if (t.type === 'expense') { totalExpense += t.amount; hasExpense = true; }
            } catch (e) {
              this.logger.error(`[register_multiple] failed for ${t.description}: ${e.message}`);
            }
          }
          const totalFmt = totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          await this.sendMessage(normalizedPhone,
            `✅ *${lines.length} lançamento${lines.length > 1 ? 's' : ''} registrado${lines.length > 1 ? 's' : ''}!*\n\n` +
            `${lines.join('\n')}` +
            (hasExpense ? `\n\n💸 *Total de gastos:* R$ ${totalFmt}` : ''),
          );
          if (hasExpense) this.budgetAlerts.checkAndNotify(user.id).catch(() => {});
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
          const isRef = (s?: string) => !s || /^(esse|este|essa|esta|isso|isto|[uú]ltimo|[uú]ltima|anterior|esse a[ií]|o de agora)\b/i.test(s.trim());
          let tx: any = null;
          if (isRef(del?.description)) {
            // "apaga esse" / "exclui o último" → usa a última transação registrada
            const last = this.lastTransaction.get(normalizedPhone);
            if (last) tx = await this.transactions.findOne(user.id, last.id).catch(() => null);
            if (!tx) {
              await this.sendMessage(normalizedPhone, `❓ Qual transação você quer excluir? Me diga o nome ou valor, ex:\n_"Cancela o mercado"_ ou _"Apaga o gasto de R$ 50"_`);
              break;
            }
          } else {
            tx = await this.transactions.findRecentByDescription(user.id, del!.description!, del?.amount);
          }
          if (!tx) {
            await this.sendMessage(normalizedPhone, `❌ Não encontrei nenhuma transação com *"${del?.description}"*.\n\nVerifique no dashboard ou tente com outro termo.`);
            break;
          }
          const fmtAmt = Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const fmtDate = new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR');
          // Store pending delete and ask for confirmation
          this.pendingDeletes.set(normalizedPhone, { txId: tx.id, description: tx.description, amount: Number(tx.amount), date: tx.date });
          await this.sendMessage(normalizedPhone, `⚠️ *Confirmar exclusão?*\n\n📝 *${tx.description}*\n💸 R$ ${fmtAmt}\n📅 ${fmtDate}\n\nResponda *sim* para confirmar ou *não* para cancelar.`);
          break;
        }

        case 'edit_transaction': {
          const { edit } = intent;
          const isRefE = (s?: string) => !s || /^(esse|este|essa|esta|isso|isto|[uú]ltimo|[uú]ltima|anterior|esse a[ií]|o de agora)\b/i.test(s.trim());
          let tx: any = null;
          if (isRefE(edit?.description)) {
            const last = this.lastTransaction.get(normalizedPhone);
            if (last) tx = await this.transactions.findOne(user.id, last.id).catch(() => null);
            if (!tx) {
              await this.sendMessage(normalizedPhone, `❓ Qual transação você quer corrigir? Ex: _"muda o mercado de 50 pra 45"_`);
              break;
            }
          } else {
            tx = await this.transactions.findRecentByDescription(user.id, edit!.description!, edit?.amount);
          }
          if (!tx) {
            await this.sendMessage(normalizedPhone, `❌ Não encontrei nenhuma transação com *"${edit?.description}"*.\n\nVerifique no dashboard ou tente com outro termo.`);
            break;
          }

          const updates: any = {};
          if (edit.new_amount != null) {
            if (!this.isValidAmount(edit.new_amount)) {
              await this.sendMessage(normalizedPhone, `🤔 Esse novo valor não parece válido. Tente algo como _"muda o valor para 80"_.`);
              break;
            }
            updates.amount = edit.new_amount;
          }
          if (edit.new_description) updates.description = edit.new_description;
          if (edit.new_date) updates.date = edit.new_date;
          if (edit.new_category) updates.category_name = edit.new_category;

          if (Object.keys(updates).length === 0) {
            await this.sendMessage(normalizedPhone, `❓ O que você quer mudar em *"${tx.description}"*? (valor, nome, categoria ou data)`);
            break;
          }

          const oldAmt = Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const updated = await this.transactions.update(user.id, tx.id, updates);
          const newAmt = Number(updated.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          const changes: string[] = [];
          if (updates.amount != null) changes.push(`💸 R$ ${oldAmt} → *R$ ${newAmt}*`);
          if (updates.description) changes.push(`📝 ${tx.description} → *${updated.description}*`);
          if (updates.category_name) changes.push(`🏷️ categoria → *${updated.categories?.name || edit.new_category}*`);
          if (updates.date) changes.push(`📅 → *${new Date(updated.date + 'T12:00:00').toLocaleDateString('pt-BR')}*`);

          await this.sendMessage(normalizedPhone,
            `✏️ *Transação atualizada!*\n\n${changes.join('\n')}`,
          );
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

        // ── METAS ───────────────────────────────────────────────────────────
        case 'create_goal': {
          const { goal } = intent;
          if (!goal?.name || !this.isValidAmount(goal?.target_amount)) {
            await this.sendMessage(normalizedPhone, `🎯 Para criar uma meta preciso saber:\n• *Nome* da meta\n• *Valor* que quer juntar\n\nEx: _"Meta de 5000 reais para viagem até dezembro"_`);
            break;
          }
          await this.goals.create(user.id, {
            name: goal.name,
            target_amount: goal.target_amount,
            deadline: goal.deadline,
            icon: goal.icon,
          });
          const fmtTarget = goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const deadlineStr = goal.deadline ? `\n📅 *Prazo:* ${new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}` : '';
          await this.sendMessage(normalizedPhone,
            `🎯 *Meta criada com sucesso!*\n\n` +
            `${goal.icon || '🎯'} *${goal.name}*\n` +
            `💰 *Objetivo:* R$ ${fmtTarget}${deadlineStr}\n\n` +
            `Para adicionar progresso, diga:\n_"Guardei 500 reais para ${goal.name}"_\n\n` +
            `📊 Acompanhe no dashboard:\n👉 *${this.dashboardUrl}/dashboard/metas*`,
          );
          break;
        }

        case 'list_goals': {
          const allGoals = await this.goals.findAll(user.id);
          if (!allGoals || allGoals.length === 0) {
            await this.sendMessage(normalizedPhone,
              `🎯 Você ainda não tem metas criadas.\n\nPara criar uma, diga:\n_"Quero juntar 5000 reais para viagem"_`,
            );
            break;
          }
          const goalLines = allGoals.map((g: any) => {
            const current = Number(g.current_amount || 0);
            const target = Number(g.target_amount);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
            const fmtCurrent = current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const fmtTarget = target.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const deadline = g.deadline ? `\n   📅 Prazo: ${new Date(g.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}` : '';
            return `${g.icon || '🎯'} *${g.name}*\n   ${bar} ${pct}%\n   R$ ${fmtCurrent} / R$ ${fmtTarget}${deadline}`;
          });
          await this.sendMessage(normalizedPhone,
            `🎯 *Suas Metas Financeiras:*\n\n${goalLines.join('\n\n')}\n\n` +
            `📊 Veja detalhes: *${this.dashboardUrl}/dashboard/metas*`,
          );
          break;
        }

        case 'add_goal_progress': {
          const { goal_progress } = intent;
          if (!goal_progress?.name || !this.isValidAmount(goal_progress?.amount)) {
            await this.sendMessage(normalizedPhone, `🎯 Me diga:\n• *Nome* da meta\n• *Valor* que guardou\n\nEx: _"Guardei 500 para viagem"_`);
            break;
          }
          const allGoals = await this.goals.findAll(user.id);
          const matched = allGoals?.find((g: any) =>
            g.name.toLowerCase().includes(goal_progress.name.toLowerCase()) ||
            goal_progress.name.toLowerCase().includes(g.name.toLowerCase().split(' ')[0]),
          );
          if (!matched) {
            await this.sendMessage(normalizedPhone,
              `❌ Não encontrei meta com o nome *"${goal_progress.name}"*.\n\nSuas metas:\n${allGoals?.map((g: any) => `• ${g.icon || '🎯'} ${g.name}`).join('\n') || 'Nenhuma meta cadastrada'}`,
            );
            break;
          }
          const updated = await this.goals.addProgress(user.id, matched.id, goal_progress.amount);
          const current = Number(updated.current_amount || 0);
          const target = Number(updated.target_amount);
          const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
          const fmtAmount = goal_progress.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const fmtCurrent = current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const fmtTarget = target.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const congrats = pct >= 100 ? `\n\n🏆 *Parabéns! Meta atingida!* 🎉` : pct >= 75 ? `\n\n🔥 Quase lá! Você está a ${100 - pct}% de atingir a meta!` : '';
          await this.sendMessage(normalizedPhone,
            `✅ *Progresso adicionado!*\n\n` +
            `${matched.icon || '🎯'} *${matched.name}*\n` +
            `💰 +R$ ${fmtAmount}\n` +
            `📈 R$ ${fmtCurrent} de R$ ${fmtTarget} (${pct}%)${congrats}`,
          );
          break;
        }

        // ── CONTAS / RECORRÊNCIAS ────────────────────────────────────────────
        case 'create_bill': {
          const { bill } = intent;
          if (!bill?.description || !this.isValidAmount(bill?.amount) || !bill?.due_date) {
            await this.sendMessage(normalizedPhone,
              `📋 Para cadastrar uma conta preciso saber:\n• *Nome* da conta\n• *Valor*\n• *Vencimento*\n\nEx: _"Cadastra aluguel 1500 vence dia 5 todo mês"_`,
            );
            break;
          }
          await this.bills.create(user.id, {
            description: bill.description,
            amount: bill.amount,
            due_date: bill.due_date,
            is_recurring: bill.is_recurring ?? false,
            recurrence_interval: bill.recurrence_interval,
          });
          const fmtAmt = bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const dueStr = new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
          const recurStr = bill.is_recurring
            ? `\n🔄 *Recorrência:* ${bill.recurrence_interval === 'weekly' ? 'Semanal' : bill.recurrence_interval === 'yearly' ? 'Anual' : 'Mensal'}`
            : '';
          await this.sendMessage(normalizedPhone,
            `📋 *Conta cadastrada!*\n\n` +
            `📝 *${bill.description}*\n` +
            `💸 *Valor:* R$ ${fmtAmt}\n` +
            `📅 *Vencimento:* ${dueStr}${recurStr}\n\n` +
            `Te avisarei próximo ao vencimento! ✅\n` +
            `📊 Veja suas contas: *${this.dashboardUrl}/dashboard/contas*`,
          );
          break;
        }

        case 'list_bills': {
          const pendingBills = await this.bills.findAll(user.id, { paid: false, upcoming: false });
          if (!pendingBills || pendingBills.length === 0) {
            await this.sendMessage(normalizedPhone,
              `📋 Você não tem contas pendentes! 🎉\n\nPara cadastrar, diga:\n_"Cadastra conta de luz 120 reais vence dia 10 todo mês"_`,
            );
            break;
          }
          const today2 = dayjs();
          const billLines = pendingBills.slice(0, 10).map((b: any) => {
            const due = dayjs(b.due_date);
            const diff = due.diff(today2, 'day');
            const dueBadge = diff < 0 ? '🔴 Vencida' : diff === 0 ? '🟡 Vence hoje' : diff <= 3 ? `🟡 Vence em ${diff}d` : `📅 ${due.format('DD/MM')}`;
            const fmtB = Number(b.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const recur = b.is_recurring ? ' 🔄' : '';
            return `• *${b.description}*${recur} — R$ ${fmtB}\n  ${dueBadge}`;
          });
          const total = pendingBills.reduce((s: number, b: any) => s + Number(b.amount), 0);
          const fmtTotal = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          await this.sendMessage(normalizedPhone,
            `📋 *Contas Pendentes:*\n\n${billLines.join('\n\n')}\n\n` +
            `💸 *Total:* R$ ${fmtTotal}\n\n` +
            `Para marcar como paga: _"Paguei a conta de luz"_`,
          );
          break;
        }

        case 'mark_bill_paid': {
          const billName = intent.bill_name;
          if (!billName) {
            await this.sendMessage(normalizedPhone, `📋 Qual conta você pagou? Ex: _"Paguei a conta de luz"_`);
            break;
          }
          const allBills = await this.bills.findAll(user.id, { paid: false });
          const matchedBill = allBills?.find((b: any) =>
            b.description.toLowerCase().includes(billName.toLowerCase()) ||
            billName.toLowerCase().includes(b.description.toLowerCase().split(' ')[0]),
          );
          if (!matchedBill) {
            await this.sendMessage(normalizedPhone,
              `❌ Não encontrei a conta *"${billName}"* em aberto.\n\nSuas contas pendentes:\n${allBills?.slice(0, 5).map((b: any) => `• ${b.description}`).join('\n') || 'Nenhuma conta pendente'}`,
            );
            break;
          }
          await this.bills.markPaid(user.id, matchedBill.id);
          const fmtPaid = Number(matchedBill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const recurMsg = matchedBill.is_recurring ? `\n🔄 Próximo vencimento já foi gerado automaticamente!` : '';
          await this.sendMessage(normalizedPhone,
            `✅ *Conta quitada!*\n\n` +
            `📝 *${matchedBill.description}*\n` +
            `💸 R$ ${fmtPaid}${recurMsg}`,
          );
          break;
        }

        case 'ask_advice': {
          await this.sendMessage(normalizedPhone, `🔍 Analisando sua situação financeira...`);
          const [reportData, allGoals, pendingBillsList] = await Promise.all([
            this.reports.getReportData(user.id),
            this.goals.findAll(user.id).catch(() => []),
            this.bills.findAll(user.id, { paid: false }).catch(() => []),
          ]);

          // Se tem plano orçamentário salvo, mostra comparação vs plano
          const query = intent.query || 'Como estou financeiramente?';
          const hasBudgetQuery = /orçamento|plano|meta mensal|como estou no|distribuição|quanto devo/i.test(query);

          if (user.budget_plan && user.monthly_income && hasBudgetQuery) {
            const comparison = await this.ai.generateBudgetComparison(
              reportData,
              user.budget_plan,
              user.monthly_income,
            );
            await this.sendMessage(normalizedPhone, comparison);
          } else {
            const advice = await this.ai.generateAdvisorResponse(query, reportData, allGoals || [], pendingBillsList || []);
            await this.sendMessage(normalizedPhone, advice);

            // Se tem plano, adiciona comparação rápida ao final
            if (user.budget_plan && user.monthly_income) {
              const comparison = await this.ai.generateBudgetComparison(
                reportData,
                user.budget_plan,
                user.monthly_income,
              );
              await this.sendMessage(normalizedPhone, `📊 *Comparativo com seu plano:*\n\n${comparison}`);
            }
          }
          break;
        }

        case 'financial_diagnosis': {
          this.pendingOnboarding.set(normalizedPhone, { stage: 'income' });
          await this.sendMessage(normalizedPhone,
            `🎯 *Vamos organizar sua vida financeira!*\n\n` +
            `Vou te fazer 4 perguntas rápidas para entender sua situação e montar um plano personalizado para você. 📋\n\n` +
            `*1/4 — Renda mensal*\n\n` +
            `Qual é a sua renda mensal líquida (o que cai na conta)?\n` +
            `Ex: _"3500"_ ou _"4200"_`,
          );
          break;
        }

        case 'economy_suggestions': {
          await this.sendMessage(normalizedPhone, `💡 Analisando seus gastos para encontrar oportunidades...`);
          const [reportData] = await Promise.all([this.reports.getReportData(user.id)]);
          const suggestions = await this.ai.generateEconomySuggestions(
            reportData.currentMonth?.topCategories?.map((c: any) => `• ${c.name}: R$ ${c.total.toFixed(2)}`).join('\n') || 'Sem gastos registrados',
            reportData.currentMonth,
            user.budget_plan,
          );
          await this.sendMessage(normalizedPhone, suggestions);
          break;
        }

        case 'simulate_goal': {
          const goalName = intent.goal_name;
          if (!goalName) {
            await this.sendMessage(normalizedPhone, `Qual meta você quer simular? Ex: _"Simula minha meta de viagem"_`);
            break;
          }

          const allGoals = await this.goals.findAll(user.id).catch(() => []);
          const matched = allGoals?.find((g: any) =>
            g.name.toLowerCase().includes(goalName.toLowerCase()) ||
            goalName.toLowerCase().includes(g.name.toLowerCase().split(' ')[0]),
          );

          if (!matched) {
            await this.sendMessage(normalizedPhone,
              `❌ Não encontrei meta com o nome *"${goalName}"*.\n\nSuas metas:\n${allGoals?.map((g: any) => `• ${g.icon || '🎯'} ${g.name}`).join('\n') || 'Nenhuma meta cadastrada'}`,
            );
            break;
          }

          const reportData = await this.reports.getReportData(user.id);
          const simulation = this.simulateGoalTimeline(matched, user.monthly_income || 0, reportData.currentMonth?.expense || 0);

          await this.sendMessage(normalizedPhone, simulation);
          break;
        }

        // ── LISTA DE COMPRAS ─────────────────────────────────────────────────
        case 'create_shopping_list': {
          const { shopping_list } = intent;
          if (!shopping_list?.name) {
            await this.sendMessage(normalizedPhone, `Qual é o nome da sua lista? Ex: _"Mercado"_, _"Farmácia"_, _"Compras da semana"_`);
            break;
          }

          const created = await this.shoppingLists.create(user.id, {
            name: shopping_list.name,
            category: shopping_list.category || 'Alimentação',
          });

          await this.sendMessage(normalizedPhone,
            `🛒 *Lista "${created.name}" criada com sucesso!*\n\n` +
            `Agora me diga quais itens você quer comprar. Pode ser assim:\n\n` +
            `_"Pão, leite, ovos, tomate"_\n\n` +
            `Ou com quantidade:\n` +
            `_"2kg frango, 1L leite, meia dúzia ovos"_\n\n` +
            `Vou estimar o preço e você não esquece de nada! 😊`,
          );
          break;
        }

        case 'add_shopping_items': {
          const { shopping_items } = intent;
          if (!shopping_items || shopping_items.length === 0) {
            await this.sendMessage(normalizedPhone, `Quais itens você quer adicionar à lista?`);
            break;
          }

          const activeLists = await this.shoppingLists.findActiveByUser(user.id);
          if (!activeLists || activeLists.length === 0) {
            await this.sendMessage(normalizedPhone, `Você não tem uma lista ativa. Cria uma com: _"Vou ao mercado"_`);
            break;
          }

          const listId = activeLists[0].id;
          const listName = activeLists[0].name;

          // Monta os itens direto, sem estimar preço
          const parsedItems = (shopping_items as any[]).map((it) =>
            typeof it === 'string'
              ? { name: it, quantity: 1, unit: 'un', estimated_price: 0 }
              : { name: it.name, quantity: it.quantity || 1, unit: it.unit || 'un', estimated_price: 0 },
          );

          // Detecta duplicados (ignora acento e maiúsculas)
          const norm = (s: string) =>
            (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
          const existing = ((activeLists[0].items || []) as any[]).map((i) => norm(i.name));

          const itemsToAdd: typeof parsedItems = [];
          const duplicates: string[] = [];
          for (const item of parsedItems) {
            const key = norm(item.name);
            if (existing.includes(key) || itemsToAdd.some((i) => norm(i.name) === key)) {
              duplicates.push(item.name);
            } else {
              itemsToAdd.push(item);
            }
          }

          if (itemsToAdd.length > 0) {
            await this.shoppingLists.addItems(listId, itemsToAdd);
          }

          const fmtQty = (item: any) =>
            item.quantity !== 1 || item.unit !== 'un' ? ` (${item.quantity}${item.unit})` : '';

          let msg = '';
          if (itemsToAdd.length > 0) {
            const itemsSummary = itemsToAdd.map((item) => `✓ ${item.name}${fmtQty(item)}`).join('\n');
            msg += `✅ *${itemsToAdd.length} item${itemsToAdd.length > 1 ? 's' : ''} adicionado${itemsToAdd.length > 1 ? 's' : ''} à sua lista "${listName}"!*\n\n${itemsSummary}\n\n`;
          }
          if (duplicates.length > 0) {
            const dupSummary = duplicates.map((n) => `• ${n}`).join('\n');
            msg += `⚠️ *Já ${duplicates.length > 1 ? 'estavam' : 'estava'} na lista* (não dupliquei):\n${dupSummary}\n\n`;
          }
          msg +=
            `📋 *Próximos passos:*\n` +
            `• Quer adicionar mais? É só mandar mais itens\n` +
            `• "_Minhas compras_" para ver a lista\n` +
            `• "_Comprei tudo_" quando terminar`;

          await this.sendMessage(normalizedPhone, msg);
          break;
        }

        case 'view_shopping_list': {
          const activeLists = await this.shoppingLists.findActiveByUser(user.id);
          if (!activeLists || activeLists.length === 0) {
            await this.sendMessage(normalizedPhone, `Você não tem uma lista ativa. Cria uma com: _"Vou ao mercado"_`);
            break;
          }

          const list = activeLists[0];
          const items = (list.items || []) as any[];
          if (items.length === 0) {
            await this.sendMessage(normalizedPhone, `📝 *${list.name}* está vazia.\n\nAdiciona itens: _"Adiciona pão, leite, ovos"_`);
            break;
          }

          const itemsList = items
            .map((item) => {
              const status = item.completed ? '✅' : '○';
              const qty = item.quantity !== 1 || item.unit !== 'un' ? ` (${item.quantity}${item.unit})` : '';
              return `${status} ${item.name}${qty}`;
            })
            .join('\n');

          const completedCount = items.filter((i: any) => i.completed).length;

          await this.sendMessage(normalizedPhone,
            `🛒 *${list.name}* (${completedCount}/${items.length} itens ✅)\n\n${itemsList}\n\n` +
            `📝 Dica: acesse o dashboard para marcar os itens enquanto compra! 📱`,
          );
          break;
        }

        case 'estimate_list_cost': {
          const activeLists = await this.shoppingLists.findActiveByUser(user.id);
          if (!activeLists || activeLists.length === 0) {
            await this.sendMessage(normalizedPhone, `Você não tem uma lista ativa.`);
            break;
          }

          const list = activeLists[0];
          const summary = await this.shoppingLists.getListSummary(list.id!);

          await this.sendMessage(normalizedPhone,
            `🛒 *${list.name}* tem ${summary.items} item${summary.items === 1 ? '' : 's'}.\n\n` +
            `Mande "_Minhas compras_" para ver a lista completa.`,
          );
          break;
        }

        case 'mark_shopping_item': {
          const names = intent.shopping_item_names || [];
          const activeLists = await this.shoppingLists.findActiveByUser(user.id);
          if (!activeLists || activeLists.length === 0) {
            await this.sendMessage(normalizedPhone, `Você não tem uma lista ativa. Cria uma com: _"Vou ao mercado"_`);
            break;
          }
          if (names.length === 0) {
            await this.sendMessage(normalizedPhone, `Qual item você comprou? Ex: _"comprei o arroz"_`);
            break;
          }

          const list = activeLists[0];
          const marked = await this.shoppingLists.markItemsByName(list.id!, names);

          if (marked.length === 0) {
            await this.sendMessage(normalizedPhone,
              `Não encontrei ${names.map((n) => `"${n}"`).join(', ')} na lista *${list.name}*.\n\nMande "_Minhas compras_" para ver os itens.`,
            );
            break;
          }

          const refreshed = await this.shoppingLists.findActiveByUser(user.id);
          const items = (refreshed[0]?.items || []) as any[];
          const completedCount = items.filter((i) => i.completed).length;
          const markedSummary = marked.map((n) => `✅ ${n}`).join('\n');

          await this.sendMessage(normalizedPhone,
            `Marquei como comprado:\n\n${markedSummary}\n\n` +
            `🛒 *${list.name}*: ${completedCount}/${items.length} itens comprados\n\n` +
            (completedCount === items.length
              ? `Tudo comprado! Mande "_Comprei tudo_" para finalizar a lista. ✨`
              : `Faltam ${items.length - completedCount}. Vai marcando conforme compra!`),
          );
          break;
        }

        case 'unmark_shopping_item': {
          const names = intent.shopping_item_names || [];
          const activeLists = await this.shoppingLists.findActiveByUser(user.id);
          if (!activeLists || activeLists.length === 0) {
            await this.sendMessage(normalizedPhone, `Você não tem uma lista ativa.`);
            break;
          }
          if (names.length === 0) {
            await this.sendMessage(normalizedPhone, `Qual item você quer desmarcar? Ex: _"ainda não comprei o arroz"_`);
            break;
          }

          const list = activeLists[0];
          const unmarked = await this.shoppingLists.markItemsByName(list.id!, names, false);

          if (unmarked.length === 0) {
            await this.sendMessage(normalizedPhone,
              `Não encontrei ${names.map((n) => `"${n}"`).join(', ')} na lista *${list.name}*.\n\nMande "_Minhas compras_" para ver os itens.`,
            );
            break;
          }

          const refreshed = await this.shoppingLists.findActiveByUser(user.id);
          const items = (refreshed[0]?.items || []) as any[];
          const completedCount = items.filter((i) => i.completed).length;
          const unmarkedSummary = unmarked.map((n) => `○ ${n}`).join('\n');

          await this.sendMessage(normalizedPhone,
            `Desmarquei (voltou pra comprar):\n\n${unmarkedSummary}\n\n` +
            `🛒 *${list.name}*: ${completedCount}/${items.length} itens comprados`,
          );
          break;
        }

        case 'remove_shopping_item': {
          const names = intent.shopping_item_names || [];
          const activeLists = await this.shoppingLists.findActiveByUser(user.id);
          if (!activeLists || activeLists.length === 0) {
            await this.sendMessage(normalizedPhone, `Você não tem uma lista ativa.`);
            break;
          }
          if (names.length === 0) {
            await this.sendMessage(normalizedPhone, `Qual item você quer remover? Ex: _"remove o shampoo da lista"_`);
            break;
          }

          const list = activeLists[0];
          const removed = await this.shoppingLists.removeItemsByName(list.id!, names);

          if (removed.length === 0) {
            await this.sendMessage(normalizedPhone,
              `Não encontrei ${names.map((n) => `"${n}"`).join(', ')} na lista *${list.name}*.\n\nMande "_Minhas compras_" para ver os itens.`,
            );
            break;
          }

          const refreshed = await this.shoppingLists.findActiveByUser(user.id);
          const items = (refreshed[0]?.items || []) as any[];
          const removedSummary = removed.map((n) => `🗑️ ${n}`).join('\n');

          await this.sendMessage(normalizedPhone,
            `Removi da lista:\n\n${removedSummary}\n\n` +
            `🛒 *${list.name}* agora tem ${items.length} item${items.length === 1 ? '' : 's'}.`,
          );
          break;
        }

        case 'complete_shopping_list': {
          const activeLists = await this.shoppingLists.findActiveByUser(user.id);
          if (!activeLists || activeLists.length === 0) {
            await this.sendMessage(normalizedPhone, `Você não tem uma lista ativa.`);
            break;
          }

          const list = activeLists[0];
          const summary = await this.shoppingLists.getListSummary(list.id!);

          // Completa a lista
          await this.shoppingLists.completeList(list.id!);

          await this.sendMessage(normalizedPhone,
            `✅ *${list.name} finalizada!*\n\n` +
            `📦 ${summary.items} ${summary.items === 1 ? 'item comprado' : 'itens comprados'}\n\n` +
            `🛒 Quer criar outra lista? É só falar: _"Vou à farmácia"_`,
          );
          break;
        }

        case 'help': {
          const firstName = (user.name || '').split(' ')[0];
          await this.sendMessage(normalizedPhone,
            `👋 Oi${firstName ? `, ${firstName}` : ''}! Eu sou o Finora — seu assistente financeiro aqui no WhatsApp. É só falar naturalmente que eu cuido do resto. Veja o que posso fazer:\n\n` +
            `💸 *Registrar gastos e receitas*\n_"Gastei 50 no mercado"_ · _"Recebi 3.000 de salário"_\n_"Paguei 100 de luz e 80 de água"_ (vários de uma vez!)\n\n` +
            `✏️ *Corrigir ou apagar*\n_"Muda o mercado pra 45"_ · _"Apaga esse"_\n\n` +
            `📊 *Consultar*\n_"Quanto gastei este mês?"_ · _"Como estou financeiramente?"_\n\n` +
            `📅 *Agenda*\n_"Agenda dentista quinta às 10h"_ · _"Meus compromissos"_\n\n` +
            `🎯 *Metas e contas*\n_"Criar meta de 5.000 pra viagem"_ · _"Cadastra a fatura do cartão dia 10"_\n\n` +
            `🛒 *Lista de compras*\n_"Vou ao mercado"_ · _"Adiciona arroz, feijão, leite"_\n\n` +
            `💡 *Dicas e organização*\n_"Me dá uma dica de economia"_ · _"Me ajuda a organizar minha vida financeira"_\n\n` +
            `📈 Todo dia de manhã te mando um resumo do seu dia. E você também acessa tudo no dashboard: *${this.dashboardUrl}*\n\n` +
            `Pode mandar ver! 🐷`,
          );
          break;
        }

        default:
          await this.sendMessage(
            normalizedPhone,
            `🤔 Não entendi muito bem. Você pode tentar assim:\n\n` +
            `💸 _"Gastei 50 no mercado"_\n` +
            `💰 _"Recebi 3.000 de salário"_\n` +
            `📊 _"Quanto gastei este mês?"_\n` +
            `📅 _"Agende dentista quinta às 10h"_\n` +
            `🛒 _"Adiciona arroz, feijão na lista"_\n` +
            `🎯 _"Criar meta de 5.000 para viagem"_\n\n` +
            `É só falar naturalmente que eu cuido do resto! 😊`,
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

  // ── Alerta quando gasto ultrapassa orçamento planejado ────────────────────
  private async sendBudgetAlert(userId: string, phone: string, transaction: any): Promise<void> {
    try {
      const user = await this.users.findById(userId);
      if (!user?.budget_plan || !user?.monthly_income) return; // Sem plano, sem alerta

      const budgetPlan = user.budget_plan as any;
      const categoryMap: Record<string, string> = {
        'Alimentação': 'alimentacao',
        'Transporte': 'transporte',
        'Moradia': 'moradia',
        'Saúde': 'saude',
        'Lazer': 'lazer',
        'Vestuário': 'roupas',
      };

      const planKey = categoryMap[transaction.category];
      if (!planKey) return; // Categoria não mapeada

      const plannedAmount = budgetPlan[planKey] || 0;
      if (plannedAmount === 0) return; // Sem limite planejado

      const reportData = await this.reports.getReportData(userId);
      const categoryEntries = reportData.transactionsByCategory?.[transaction.category] || [];
      const actualSpent = categoryEntries
        .filter((t: any) => t.type === 'expense')
        .reduce((s: number, t: any) => s + Number(t.amount), 0);

      const percentUsed = (actualSpent / plannedAmount) * 100;

      // Alerta quando passa de 80% e 100% do orçamento
      if (percentUsed >= 100) {
        const excess = actualSpent - plannedAmount;
        await this.sendMessage(phone,
          `⚠️ *${transaction.category} — Orçamento ultrapassado!*\n\n` +
          `Planejado: R$ ${plannedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `Gasto: R$ ${actualSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `Excesso: R$ ${excess.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
          `Considere reduzir gastos nos próximos dias. 💪`,
        );
      } else if (percentUsed >= 80) {
        const remaining = plannedAmount - actualSpent;
        await this.sendMessage(phone,
          `🟡 *${transaction.category} — Limite próximo!*\n\n` +
          `Você já usou ${Math.round(percentUsed)}% do orçamento.\n` +
          `Restam: R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para o mês.`,
        );
      }
    } catch {
      // Silent fail — alerta é não-crítico
    }
  }

  // ── Simula timeline da meta ───────────────────────────────────────────────
  private simulateGoalTimeline(goal: any, monthlyIncome: number, currentMonthExpense: number): string {
    const disposableIncome = monthlyIncome - currentMonthExpense;
    const remaining = goal.target_amount - (goal.current_amount || 0);

    if (disposableIncome <= 0) {
      return `⚠️ *${goal.name}*\n\nVocê não tem renda disponível para esta meta no momento (gastos ≥ renda).\n\nReduca despesas primeiro! 💪`;
    }

    const monthsNeeded = Math.ceil(remaining / disposableIncome);
    const completionDate = dayjs().add(monthsNeeded, 'month').format('MMMM/YYYY');

    let sim = `🎯 *Simulação: ${goal.name}*\n\n`;
    sim += `Faltam: R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    sim += `Renda disponível/mês: R$ ${disposableIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    sim += `📅 *Estimativa: ${monthsNeeded} meses*\n`;
    sim += `Você atinge em: *${completionDate}*\n\n`;

    // Explore faster scenarios
    const faster = disposableIncome * 1.5;
    const fasterMonths = Math.ceil(remaining / faster);
    const fasterDate = dayjs().add(fasterMonths, 'month').format('MMMM/YYYY');

    sim += `💡 *Se economizar mais:*\n`;
    sim += `├ +50% (R$ ${faster.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}): ${fasterMonths} meses (${fasterDate})\n`;

    const muchFaster = disposableIncome * 2;
    const muchFasterMonths = Math.ceil(remaining / muchFaster);
    const muchFasterDate = dayjs().add(muchFasterMonths, 'month').format('MMMM/YYYY');
    sim += `└ +100% (R$ ${muchFaster.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}): ${muchFasterMonths} meses (${muchFasterDate})`;

    return sim;
  }

  // ── Busca dados da categoria e envia comentário consultor ───────────────
  private async sendConsultorComment(userId: string, phone: string, transaction: any): Promise<void> {
    try {
      const [reportData, allGoals] = await Promise.all([
        this.reports.getReportData(userId),
        this.goals.findAll(userId).catch(() => []),
      ]);

      // Total gasto nesta categoria no mês (inclui a transação atual)
      const categoryEntries = reportData.transactionsByCategory?.[transaction.category] || [];
      const categoryMonthTotal = categoryEntries
        .filter((t: any) => t.type === 'expense')
        .reduce((s: number, t: any) => s + Number(t.amount), 0);

      const monthIncome = reportData.currentMonth?.income || 0;

      const comment = await this.ai.generateTransactionComment(
        transaction,
        categoryMonthTotal || transaction.amount,
        0, // last month per-category not available without extra query
        monthIncome,
        allGoals || [],
      );

      if (comment) {
        await this.sendMessage(phone, comment);
      }
    } catch {
      // Silent fail — comentário é não-crítico
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
