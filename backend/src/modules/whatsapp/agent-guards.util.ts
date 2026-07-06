// Regras puras (sem estado) usadas pelo agente do WhatsApp.
// Extraídas para permitir testes unitários das regras de dinheiro/flood.

export const MAX_AMOUNT = 1_000_000_000; // teto de valor (R$ 1 bi)
export const RATE_WINDOW_MS = 60_000;    // janela de 1 minuto
export const RATE_MAX_MSGS = 15;         // máx. de mensagens por janela

/** Valor monetário válido: número finito, positivo e dentro do teto. */
export function isValidAmount(n: unknown, max: number = MAX_AMOUNT): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= max;
}

/**
 * Janela deslizante. Recebe os timestamps anteriores e o agora; devolve os
 * timestamps ainda dentro da janela (já com o atual incluído) e se estourou o limite.
 */
export function slidingWindow(
  timestamps: number[],
  now: number,
  windowMs: number = RATE_WINDOW_MS,
  max: number = RATE_MAX_MSGS,
): { recent: number[]; limited: boolean } {
  const windowStart = now - windowMs;
  const recent = timestamps.filter((t) => t > windowStart);
  recent.push(now);
  return { recent, limited: recent.length > max };
}
