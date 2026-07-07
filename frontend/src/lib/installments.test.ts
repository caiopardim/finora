import { describe, it, expect } from 'vitest';
import { addMonths, validateInstallments, buildInstallmentRows, MAX_INSTALLMENTS } from './installments';

describe('addMonths', () => {
  it('avança meses simples', () => {
    expect(addMonths('2026-01-15', 0)).toBe('2026-01-15');
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonths('2026-01-15', 11)).toBe('2026-12-15');
  });

  it('vira o ano corretamente', () => {
    expect(addMonths('2026-07-20', 6)).toBe('2027-01-20');
    expect(addMonths('2026-07-20', 12)).toBe('2027-07-20');
  });

  it('lida com overflow de dia (dia 31 em mês curto)', () => {
    // 31 de janeiro + 1 mês → fevereiro não tem 31, o Date rola para março
    expect(addMonths('2026-01-31', 1)).toBe('2026-03-03');
  });
});

describe('validateInstallments', () => {
  const base = { description: 'Financiamento', amount: 2441.82, due_date: '2026-07-20', installments: 420 };

  it('aceita payload válido no limite máximo', () => {
    expect(validateInstallments(base)).toEqual({ ok: true });
  });

  it('rejeita descrição vazia', () => {
    expect(validateInstallments({ ...base, description: '  ' }).ok).toBe(false);
  });

  it('rejeita valor zero/negativo/inválido', () => {
    expect(validateInstallments({ ...base, amount: 0 }).ok).toBe(false);
    expect(validateInstallments({ ...base, amount: -5 }).ok).toBe(false);
    expect(validateInstallments({ ...base, amount: NaN }).ok).toBe(false);
  });

  it('rejeita data em formato errado', () => {
    expect(validateInstallments({ ...base, due_date: '20/07/2026' }).ok).toBe(false);
    expect(validateInstallments({ ...base, due_date: '' }).ok).toBe(false);
  });

  it('rejeita parcelas fora do intervalo 2..MAX', () => {
    expect(validateInstallments({ ...base, installments: 1 }).ok).toBe(false);
    expect(validateInstallments({ ...base, installments: MAX_INSTALLMENTS + 1 }).ok).toBe(false);
    expect(validateInstallments({ ...base, installments: 2.5 }).ok).toBe(false);
  });
});

describe('buildInstallmentRows', () => {
  it('gera N linhas numeradas com datas mensais', () => {
    const rows = buildInstallmentRows({ description: 'Sofá', amount: 100, due_date: '2026-07-20', installments: 3, category_id: 'cat1' });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ description: 'Sofá (1/3)', due_date: '2026-07-20', installment_number: 1, installments: 3, amount: 100, category_id: 'cat1', paid: false, recurrent: false });
    expect(rows[1]).toMatchObject({ description: 'Sofá (2/3)', due_date: '2026-08-20', installment_number: 2 });
    expect(rows[2]).toMatchObject({ description: 'Sofá (3/3)', due_date: '2026-09-20', installment_number: 3 });
  });

  it('normaliza category_id ausente para null', () => {
    const rows = buildInstallmentRows({ description: 'X', amount: 10, due_date: '2026-01-01', installments: 2 });
    expect(rows[0].category_id).toBeNull();
  });
});
