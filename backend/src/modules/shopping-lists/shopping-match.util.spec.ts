import { normalizeName, matchItemsByName, isDuplicate } from './shopping-match.util';

describe('normalizeName', () => {
  it('remove acentos e coloca em minúsculo', () => {
    expect(normalizeName('Feijão')).toBe('feijao');
    expect(normalizeName('  ARROZ  ')).toBe('arroz');
    expect(normalizeName('Pão de Açúcar')).toBe('pao de acucar');
  });

  it('lida com valores vazios/nulos', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName(undefined as any)).toBe('');
  });
});

describe('matchItemsByName', () => {
  const items = [
    { name: 'Arroz' },
    { name: 'Feijão' },
    { name: 'Leite integral' },
  ];

  it('casa ignorando acento e caixa', () => {
    expect(matchItemsByName(items, ['feijao']).map((i) => i.name)).toEqual(['Feijão']);
    expect(matchItemsByName(items, ['ARROZ']).map((i) => i.name)).toEqual(['Arroz']);
  });

  it('casa parcialmente (usuário diz "leite", item é "Leite integral")', () => {
    expect(matchItemsByName(items, ['leite']).map((i) => i.name)).toEqual(['Leite integral']);
  });

  it('casa vários alvos de uma vez', () => {
    expect(matchItemsByName(items, ['arroz', 'feijao']).map((i) => i.name)).toEqual(['Arroz', 'Feijão']);
  });

  it('retorna vazio quando nada casa ou lista de alvos vazia', () => {
    expect(matchItemsByName(items, ['banana'])).toEqual([]);
    expect(matchItemsByName(items, [])).toEqual([]);
    expect(matchItemsByName(items, [''])).toEqual([]);
  });
});

describe('isDuplicate', () => {
  it('detecta duplicado ignorando acento/caixa', () => {
    expect(isDuplicate(['Frango', 'Arroz'], 'frango')).toBe(true);
    expect(isDuplicate(['Frango'], 'FRANGO')).toBe(true);
    expect(isDuplicate(['Feijão'], 'feijao')).toBe(true);
  });

  it('retorna false para item novo', () => {
    expect(isDuplicate(['Frango', 'Arroz'], 'leite')).toBe(false);
    expect(isDuplicate([], 'leite')).toBe(false);
  });
});
