// Regras puras de geração de parcelas — compartilhadas pela API route e testes.

export const MAX_INSTALLMENTS = 420;

/** Adiciona `months` meses a uma data YYYY-MM-DD (UTC, sem libs). */
export function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const base = new Date(Date.UTC(y, (m - 1) + months, d));
  return base.toISOString().slice(0, 10);
}

export interface InstallmentInput {
  description: string;
  amount: number;
  due_date: string;
  installments: number;
  category_id?: string | null;
}

export interface InstallmentValidation {
  ok: boolean;
  error?: string;
}

/** Valida o payload de criação de parcelas. */
export function validateInstallments(input: Partial<InstallmentInput>): InstallmentValidation {
  const description = String(input.description || '').trim();
  const amount = Number(input.amount);
  const dueDate = String(input.due_date || '');
  const installments = Number(input.installments);

  if (!description) return { ok: false, error: 'Descrição obrigatória' };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Valor por parcela inválido' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, error: 'Data de vencimento inválida' };
  if (!Number.isInteger(installments) || installments < 2) return { ok: false, error: 'Número de parcelas deve ser ao menos 2' };
  if (installments > MAX_INSTALLMENTS) return { ok: false, error: `Número de parcelas deve ser no máximo ${MAX_INSTALLMENTS}` };
  return { ok: true };
}

export interface InstallmentRow {
  description: string;
  amount: number;
  due_date: string;
  category_id: string | null;
  paid: boolean;
  recurrent: boolean;
  installments: number;
  installment_number: number;
}

/** Gera as linhas das parcelas (sem user_id/group — o caller adiciona). */
export function buildInstallmentRows(input: InstallmentInput): InstallmentRow[] {
  const { description, amount, due_date, installments, category_id = null } = input;
  return Array.from({ length: installments }, (_, i) => ({
    description: `${description} (${i + 1}/${installments})`,
    amount,
    due_date: addMonths(due_date, i),
    category_id: category_id ?? null,
    paid: false,
    recurrent: false,
    installments,
    installment_number: i + 1,
  }));
}
