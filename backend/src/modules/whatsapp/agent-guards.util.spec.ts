import { isValidAmount, slidingWindow, MAX_AMOUNT } from './agent-guards.util';

describe('isValidAmount', () => {
  it('aceita valores positivos finitos dentro do teto', () => {
    expect(isValidAmount(0.01)).toBe(true);
    expect(isValidAmount(50)).toBe(true);
    expect(isValidAmount(2441.82)).toBe(true);
    expect(isValidAmount(MAX_AMOUNT)).toBe(true);
  });

  it('rejeita zero e negativos', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount(-9999)).toBe(false);
  });

  it('rejeita valores acima do teto', () => {
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false);
    expect(isValidAmount(1e12)).toBe(false);
  });

  it('rejeita não-números e valores não-finitos', () => {
    expect(isValidAmount(NaN)).toBe(false);
    expect(isValidAmount(Infinity)).toBe(false);
    expect(isValidAmount('50' as any)).toBe(false);
    expect(isValidAmount(null as any)).toBe(false);
    expect(isValidAmount(undefined as any)).toBe(false);
  });

  it('respeita um teto customizado', () => {
    expect(isValidAmount(100, 60)).toBe(false);
    expect(isValidAmount(60, 60)).toBe(true);
  });
});

describe('slidingWindow', () => {
  it('não limita dentro do máximo', () => {
    const now = 1_000_000;
    const { recent, limited } = slidingWindow([], now, 60_000, 3);
    expect(limited).toBe(false);
    expect(recent).toEqual([now]);
  });

  it('limita ao exceder o máximo dentro da janela', () => {
    const now = 1_000_000;
    const prev = [now - 100, now - 200, now - 300]; // 3 anteriores
    const { limited } = slidingWindow(prev, now, 60_000, 3); // +1 = 4 > 3
    expect(limited).toBe(true);
  });

  it('descarta timestamps fora da janela', () => {
    const now = 1_000_000;
    const prev = [now - 70_000, now - 65_000, now - 100]; // 2 fora da janela de 60s
    const { recent, limited } = slidingWindow(prev, now, 60_000, 3);
    expect(recent).toEqual([now - 100, now]); // só o de dentro + o atual
    expect(limited).toBe(false);
  });

  it('mensagens antigas expiram e liberam novamente', () => {
    const windowMs = 60_000;
    const max = 2;
    let ts: number[] = [];
    // 3 mensagens rápidas → a 3ª limita
    ({ recent: ts } = slidingWindow(ts, 0, windowMs, max));
    ({ recent: ts } = slidingWindow(ts, 10, windowMs, max));
    let res = slidingWindow(ts, 20, windowMs, max);
    expect(res.limited).toBe(true);
    // muito depois → janela zera, não limita
    res = slidingWindow(res.recent, 200_000, windowMs, max);
    expect(res.limited).toBe(false);
  });
});
