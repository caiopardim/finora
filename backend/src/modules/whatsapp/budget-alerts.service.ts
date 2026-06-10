import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import { WhatsappService } from './whatsapp.service';

/**
 * Checks monthly spending vs budget after each transaction and sends
 * WhatsApp alerts at 80% (warning) and 100%+ (exceeded) thresholds.
 *
 * Uses an in-memory Set keyed by "userId-YYYY-MM-threshold" to avoid
 * duplicate messages within the same server session.
 */
@Injectable()
export class BudgetAlertsService {
  private readonly logger = new Logger(BudgetAlertsService.name);
  // Key: `${userId}-${YYYY-MM}-${threshold}` e.g. "abc-2026-06-80" | "abc-2026-06-100"
  private readonly sentAlerts = new Set<string>();

  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
    @Inject(forwardRef(() => WhatsappService)) private whatsapp: WhatsappService,
  ) {}

  async checkAndNotify(userId: string): Promise<void> {
    try {
      const now = new Date();
      const month = now.toISOString().slice(0, 7); // "YYYY-MM"
      const monthStart = `${month}-01`;
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      // Fetch total budgets and current month expenses in parallel
      const [budgetRes, spendingRes, profileRes] = await Promise.all([
        this.supabase
          .from('categories')
          .select('budget_limit')
          .eq('user_id', userId)
          .not('budget_limit', 'is', null),
        this.supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('date', monthStart)
          .lte('date', monthEnd),
        this.supabase
          .from('profiles')
          .select('phone')
          .eq('id', userId)
          .single(),
      ]);

      const totalBudget = (budgetRes.data || []).reduce(
        (s, c) => s + Number(c.budget_limit || 0),
        0,
      );
      const totalSpent = (spendingRes.data || []).reduce(
        (s, t) => s + Number(t.amount || 0),
        0,
      );
      const phone = profileRes.data?.phone;

      if (!totalBudget || !phone) return;

      const pct = (totalSpent / totalBudget) * 100;
      this.logger.log(
        `Budget check for ${userId}: spent R$${totalSpent.toFixed(2)} / R$${totalBudget.toFixed(2)} (${pct.toFixed(1)}%)`,
      );

      const fmt = (v: number) =>
        v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // 100% threshold — exceeded
      const key100 = `${userId}-${month}-100`;
      if (pct >= 100 && !this.sentAlerts.has(key100)) {
        this.sentAlerts.add(key100);
        await this.whatsapp.sendMessage(
          phone.replace(/\D/g, ''),
          `🚨 *Orçamento do mês ultrapassado!*\n\n` +
          `Você gastou *R$ ${fmt(totalSpent)}* de um orçamento de *R$ ${fmt(totalBudget)}*.\n\n` +
          `⚠️ Revise seus gastos para não comprometer o mês. Acesse o dashboard para mais detalhes:\n` +
          `👉 *https://meufinora.com.br/dashboard*`,
        );
        this.logger.log(`Sent 100% budget alert to ${phone}`);
        return;
      }

      // 80% threshold — warning
      const key80 = `${userId}-${month}-80`;
      if (pct >= 80 && pct < 100 && !this.sentAlerts.has(key80)) {
        this.sentAlerts.add(key80);
        const remaining = totalBudget - totalSpent;
        await this.whatsapp.sendMessage(
          phone.replace(/\D/g, ''),
          `⚠️ *Atenção! Você usou ${Math.round(pct)}% do seu orçamento mensal.*\n\n` +
          `💸 Gasto: *R$ ${fmt(totalSpent)}*\n` +
          `🎯 Orçamento: *R$ ${fmt(totalBudget)}*\n` +
          `✅ Restante: *R$ ${fmt(remaining)}*\n\n` +
          `Fique de olho para não ultrapassar o limite! 👀`,
        );
        this.logger.log(`Sent 80% budget alert to ${phone}`);
      }
    } catch (err) {
      this.logger.error(`Budget alert check failed for ${userId}: ${err.message}`);
    }
  }
}
