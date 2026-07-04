import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import { ReportsService } from '../reports/reports.service';
import { AiService } from './ai.service';
import { WhatsappService } from './whatsapp.service';
import { GoalsService } from '../goals/goals.service';
import * as dayjs from 'dayjs';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
    private reports: ReportsService,
    private ai: AiService,
    private whatsapp: WhatsappService,
    private goals: GoalsService,
  ) {}

  // ── Relatório mensal no 1º dia às 8:00 ─────────────────────────────────────
  @Cron('0 8 1 * *', { name: 'monthlyReport', timeZone: 'America/Sao_Paulo' })
  async sendMonthlyReports() {
    this.logger.log('[Cron] Iniciando envio de relatórios mensais...');
    try {
      const { data: users } = await this.supabase
        .from('profiles')
        .select('id, phone, monthly_income, budget_plan')
        .eq('paid', true)
        .limit(100);

      for (const user of users || []) {
        try {
          await this.sendPersonalizedMonthlyReport(user.id, user.phone, user.monthly_income, user.budget_plan);
        } catch (err) {
          this.logger.error(`Failed to send report to ${user.phone}`, err.message);
        }
      }
    } catch (err) {
      this.logger.error('sendMonthlyReports failed', err.message);
    }
  }

  // ── Relatório semanal todo domingo às 19:00 ────────────────────────────────
  @Cron('0 19 * * 0', { name: 'weeklyReport', timeZone: 'America/Sao_Paulo' })
  async sendWeeklyReports() {
    this.logger.log('[Cron] Iniciando envio de relatórios semanais...');
    try {
      const { data: users } = await this.supabase
        .from('profiles')
        .select('id, phone, monthly_income, budget_plan')
        .eq('paid', true)
        .limit(100);

      for (const user of users || []) {
        try {
          await this.sendPersonalizedWeeklyReport(user.id, user.phone, user.monthly_income, user.budget_plan);
        } catch (err) {
          this.logger.error(`Failed to send weekly report to ${user.phone}`, err.message);
        }
      }
    } catch (err) {
      this.logger.error('sendWeeklyReports failed', err.message);
    }
  }

  // ── Resumo diário proativo — todo dia às 7:00 ──────────────────────────────
  @Cron('0 7 * * *', { name: 'dailySummary', timeZone: 'America/Sao_Paulo' })
  async sendDailySummaries() {
    this.logger.log('[Cron] Iniciando envio de resumos diários...');
    try {
      const { data: users } = await this.supabase
        .from('profiles')
        .select('id, phone, name, monthly_income')
        .eq('paid', true)
        .not('phone', 'is', null)
        .limit(500);

      for (const user of users || []) {
        try {
          await this.sendDailySummary(user.id, user.phone, user.name, user.monthly_income);
        } catch (err) {
          this.logger.error(`Failed to send daily summary to ${user.phone}`, err.message);
        }
      }
    } catch (err) {
      this.logger.error('sendDailySummaries failed', err.message);
    }
  }

  private async sendDailySummary(userId: string, phone: string, name: string, monthlyIncome: number): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

    const [apptsRes, billsRes, txRes] = await Promise.all([
      this.supabase.from('appointments').select('title, time, done').eq('user_id', userId).eq('date', today).order('time', { nullsFirst: false }),
      this.supabase.from('bills').select('description, amount').eq('user_id', userId).eq('paid', false).eq('due_date', today),
      this.supabase.from('transactions').select('type, amount').eq('user_id', userId).gte('date', monthStart).lte('date', today),
    ]);

    const appts = (apptsRes.data || []).filter((a: any) => !a.done);
    const bills = billsRes.data || [];
    const txs = txRes.data || [];

    const income = txs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = txs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const balance = income - expense;

    // Alerta de orçamento: gastou muito da renda no mês?
    const spentPct = monthlyIncome > 0 ? (expense / monthlyIncome) * 100 : 0;
    const budgetWarning = monthlyIncome > 0 && spentPct >= 80;

    // Só envia se houver algo relevante (evita spam diário)
    if (appts.length === 0 && bills.length === 0 && !budgetWarning) return;

    const money = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    let msg = `☀️ *Bom dia${name ? `, ${name.split(' ')[0]}` : ''}!* Seu resumo de hoje:\n`;

    if (appts.length > 0) {
      msg += `\n📅 *Compromissos de hoje:*\n`;
      msg += appts.map((a: any) => `• ${a.time ? a.time.slice(0, 5) + ' — ' : ''}${a.title}`).join('\n') + '\n';
    }

    if (bills.length > 0) {
      const total = bills.reduce((s: number, b: any) => s + Number(b.amount), 0);
      msg += `\n💳 *Vence hoje:*\n`;
      msg += bills.map((b: any) => `• ${b.description} — R$ ${money(Number(b.amount))}`).join('\n') + '\n';
      if (bills.length > 1) msg += `_Total: R$ ${money(total)}_\n`;
    }

    msg += `\n💰 Saldo do mês até agora: *R$ ${money(balance)}*\n`;

    if (budgetWarning) {
      msg += `\n⚠️ Você já usou *${spentPct.toFixed(0)}%* da sua renda este mês. Segura o ritmo! 💪\n`;
    }

    msg += `\nTenha um ótimo dia! 🐷`;

    await this.whatsapp.sendMessage(phone, msg);
  }

  // ── Relatório mensal personalizado ─────────────────────────────────────────
  private async sendPersonalizedMonthlyReport(
    userId: string,
    phone: string,
    monthlyIncome: number,
    budgetPlan: any,
  ): Promise<void> {
    const reportData = await this.reports.getReportData(userId);
    const allGoals = await this.goals.findAll(userId).catch(() => []);

    const lastMonth = dayjs().subtract(1, 'month').format('MMMM/YYYY');
    const expense = reportData.lastMonth?.expense || 0;
    const income = reportData.lastMonth?.income || 0;
    const balance = income - expense;
    const savingsRate = monthlyIncome > 0 ? ((balance / monthlyIncome) * 100).toFixed(1) : 0;

    let report = `📊 *Relatório de ${lastMonth}*\n\n`;
    report += `💰 Receitas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `💸 Gastos: R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `✅ Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `📈 Taxa de poupança: ${savingsRate}%\n\n`;

    // Top categories
    const topCats = reportData.currentMonth?.topCategories?.slice(0, 3) || [];
    if (topCats.length > 0) {
      report += `🏆 *Top 3 Categorias:*\n`;
      topCats.forEach((c: any, i: number) => {
        const pct = monthlyIncome > 0 ? ((c.total / monthlyIncome) * 100).toFixed(1) : 0;
        report += `${i + 1}. ${c.name}: R$ ${c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct}%)\n`;
      });
      report += '\n';
    }

    // Goal progress
    const activeGoals = allGoals?.filter((g: any) => (g.current_amount || 0) < (g.target_amount || 0)).slice(0, 2) || [];
    if (activeGoals.length > 0) {
      report += `🎯 *Progresso das Metas:*\n`;
      activeGoals.forEach((g: any) => {
        const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
        const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        report += `${g.icon || '🎯'} ${g.name}: ${bar} ${pct}%\n`;
      });
      report += '\n';
    }

    report += `━━━━━━━━━━━━━━━\n\n`;
    report += `💡 *Dica:* Use *"como estou no orçamento?"* para ver o comparativo com seu plano mensal.\n`;
    report += `📱 Dashboard: ${dayjs().format('DD/MM/YYYY')}`;

    await this.whatsapp.sendMessage(phone, report);
  }

  // ── Relatório semanal personalizado ────────────────────────────────────────
  private async sendPersonalizedWeeklyReport(
    userId: string,
    phone: string,
    monthlyIncome: number,
    budgetPlan: any,
  ): Promise<void> {
    const reportData = await this.reports.getReportData(userId);

    const weekStart = dayjs().subtract(7, 'day').format('DD/MM');
    const today = dayjs().format('DD/MM');
    const weekExpense = reportData.currentMonth?.expense || 0;
    const weekIncome = reportData.currentMonth?.income || 0;
    const weekBalance = weekIncome - weekExpense;

    let report = `📈 *Semana ${weekStart} - ${today}*\n\n`;
    report += `💸 Gastos: R$ ${weekExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `💰 Receitas: R$ ${weekIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    report += `✅ Saldo: R$ ${weekBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

    // Budget status
    if (budgetPlan && monthlyIncome > 0) {
      const daysLeftInMonth = dayjs().endOf('month').diff(dayjs(), 'day');
      const expectedDailySpend = monthlyIncome / dayjs().daysInMonth();
      const idealSpentToday = expectedDailySpend * dayjs().date();
      const actualSpent = weekExpense;

      if (actualSpent > idealSpentToday * 1.15) {
        report += `⚠️ *Atenção:* Você já gastou R$ ${actualSpent.toFixed(2)} — ${((actualSpent / monthlyIncome) * 100).toFixed(1)}% da sua renda mensal.\n`;
        report += `Restam ${daysLeftInMonth} dias. Reduza o ritmo! 💪\n`;
      } else {
        report += `✅ *Parabéns!* Você está dentro do orçamento até agora.\n`;
      }
      report += '\n';
    }

    report += `💡 Continue registrando seus gastos — cada transação conta! 📝`;

    await this.whatsapp.sendMessage(phone, report);
  }

  // ── Análise com sugestões de economia (chamado on-demand) ──────────────────
  async generateEconomySuggestions(userId: string, reportData: any, budgetPlan: any): Promise<string> {
    const topSpenders = reportData.currentMonth?.topCategories?.slice(0, 3) || [];
    if (topSpenders.length === 0) return 'Sem dados para análise ainda.';

    const summary = topSpenders
      .map((c: any) => `• ${c.name}: R$ ${c.total.toFixed(2)}`)
      .join('\n');

    return await this.ai.generateEconomySuggestions(summary, reportData.currentMonth, budgetPlan);
  }

  // ── Simulador de metas ────────────────────────────────────────────────────
  async simulateGoalTimeline(
    goal: any,
    monthlyIncome: number,
    currentMonthExpense: number,
  ): Promise<string> {
    const disposableIncome = monthlyIncome - currentMonthExpense;
    const remaining = goal.target_amount - (goal.current_amount || 0);

    if (disposableIncome <= 0) {
      return `⚠️ Você não tem renda disponível para esta meta no momento (gastos ≥ renda).\n\nReduca despesas primeiro! 💪`;
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
}
