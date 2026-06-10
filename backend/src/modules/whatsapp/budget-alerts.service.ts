import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class BudgetAlertsService {
  private readonly logger = new Logger(BudgetAlertsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
    @Inject(forwardRef(() => WhatsappService)) private whatsapp: WhatsappService,
  ) {}

  private async alreadySent(key: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('budget_alert_logs')
      .select('id')
      .eq('alert_key', key)
      .maybeSingle();
    return !!data;
  }

  private async markSent(key: string): Promise<void> {
    await this.supabase.from('budget_alert_logs').insert({ alert_key: key });
  }

  async checkAndNotify(userId: string): Promise<void> {
    try {
      const now = new Date();
      const month = now.toISOString().slice(0, 7);
      const monthStart = `${month}-01`;
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const [categoriesRes, spendingRes, profileRes] = await Promise.all([
        this.supabase
          .from('categories')
          .select('id,name,budget_limit,icon')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .not('budget_limit', 'is', null),
        this.supabase
          .from('transactions')
          .select('amount,category_id')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('date', monthStart)
          .lte('date', monthEnd),
        this.supabase.from('profiles').select('phone').eq('id', userId).single(),
      ]);

      const phone = profileRes.data?.phone;
      if (!phone) return;

      const fmt = (v: number) =>
        v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const categories = categoriesRes.data || [];
      const txs = spendingRes.data || [];

      // ── Gasto por categoria ──────────────────────────────────────────────
      const spendByCat: Record<string, number> = {};
      for (const t of txs) {
        const k = t.category_id || 'none';
        spendByCat[k] = (spendByCat[k] || 0) + Number(t.amount);
      }

      // ── Total geral ──────────────────────────────────────────────────────
      const totalBudget = categories.reduce((s, c) => s + Number(c.budget_limit), 0);
      const totalSpent  = Object.values(spendByCat).reduce((s, v) => s + v, 0);

      if (totalBudget > 0) {
        const pct       = (totalSpent / totalBudget) * 100;
        const roundPct  = Math.round(pct);
        const remaining = totalBudget - totalSpent;

        const key100 = `${userId}-${month}-total-100`;
        const key50  = `${userId}-${month}-total-50`;

        if (pct > 100 && !(await this.alreadySent(key100))) {
          await this.markSent(key100);
          await this.whatsapp.sendMessage(phone.replace(/\D/g, ''),
            `🚨 *Orçamento do mês ultrapassado!*\n\n` +
            `💸 Gasto: *R$ ${fmt(totalSpent)}*\n` +
            `🎯 Orçamento: *R$ ${fmt(totalBudget)}*\n` +
            `📈 Excedido em: *R$ ${fmt(totalSpent - totalBudget)}*\n\n` +
            `Revise seus gastos no dashboard:\n👉 *https://meufinora.com.br/dashboard*`,
          );
          this.logger.log(`Sent total 100% alert`);
        } else if (pct >= 50 && pct <= 100 && !(await this.alreadySent(key50))) {
          await this.markSent(key50);
          await this.whatsapp.sendMessage(phone.replace(/\D/g, ''),
            `📊 *Você já usou metade do seu orçamento mensal (${roundPct}%)!*\n\n` +
            `💸 Gasto: *R$ ${fmt(totalSpent)}*\n` +
            `🎯 Orçamento: *R$ ${fmt(totalBudget)}*\n` +
            `✅ Restante: *R$ ${fmt(remaining)}*\n\n` +
            `Ainda há ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()} dias no mês — você está no caminho certo! 💪`,
          );
          this.logger.log(`Sent total 50% alert`);
        }
      }

      // ── Alertas por categoria ─────────────────────────────────────────────
      for (const cat of categories) {
        const spent  = spendByCat[cat.id] || 0;
        const budget = Number(cat.budget_limit);
        if (!budget || !spent) continue;

        const pct      = (spent / budget) * 100;
        const roundPct = Math.round(pct);
        const icon     = cat.icon || '📦';

        const key100 = `${userId}-${month}-cat-${cat.id}-100`;
        const key50  = `${userId}-${month}-cat-${cat.id}-50`;

        if (pct > 100 && !(await this.alreadySent(key100))) {
          await this.markSent(key100);
          await this.whatsapp.sendMessage(phone.replace(/\D/g, ''),
            `🚨 *${icon} ${cat.name}: orçamento ultrapassado!*\n\n` +
            `💸 Gasto: *R$ ${fmt(spent)}*\n` +
            `🎯 Limite: *R$ ${fmt(budget)}*\n` +
            `📈 Excedido em: *R$ ${fmt(spent - budget)}*`,
          );
          this.logger.log(`Sent cat 100% alert for ${cat.name}`);
        } else if (pct >= 50 && pct <= 100 && !(await this.alreadySent(key50))) {
          await this.markSent(key50);
          await this.whatsapp.sendMessage(phone.replace(/\D/g, ''),
            `📊 *${icon} ${cat.name}: metade do orçamento usada (${roundPct}%)!*\n\n` +
            `💸 Gasto: *R$ ${fmt(spent)}*\n` +
            `🎯 Limite: *R$ ${fmt(budget)}*\n` +
            `✅ Restante: *R$ ${fmt(budget - spent)}*`,
          );
          this.logger.log(`Sent cat 50% alert for ${cat.name}`);
        }
      }
    } catch (err) {
      this.logger.error(`Budget alert check failed for ${userId}: ${err.message}`);
    }
  }
}
