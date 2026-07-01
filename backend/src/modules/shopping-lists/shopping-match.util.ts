// Utilitários puros para casar nomes de itens de compras.
// Extraídos para poderem ser testados isoladamente (foi onde mais tivemos bugs).

/** Normaliza um nome: minúsculo, sem acento, sem espaços nas pontas. */
export function normalizeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Dado um conjunto de nomes-alvo (o que o usuário disse) e a lista de itens,
 * retorna os itens que casam (parcial, ignorando acento/caixa).
 */
export function matchItemsByName<T extends { name: string }>(items: T[], names: string[]): T[] {
  const targets = names.map(normalizeName).filter(Boolean);
  if (targets.length === 0) return [];
  return items.filter((item) => {
    const n = normalizeName(item.name);
    return targets.some((t) => n.includes(t) || t.includes(n));
  });
}

/** Verifica se um item já existe na lista (usado para evitar duplicados). */
export function isDuplicate(existingNames: string[], candidate: string): boolean {
  const key = normalizeName(candidate);
  return existingNames.map(normalizeName).includes(key);
}
