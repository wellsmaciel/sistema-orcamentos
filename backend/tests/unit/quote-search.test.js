import { parseQuoteNumberSearch } from '../../src/utils/quote-search.js';

describe('Busca pelo número do orçamento', () => {
  test.each([
    ['2572', 2572],
    ['002572', 2572],
    ['  2572  ', 2572],
    ['nº 2572', 2572],
    ['Nº2572', 2572],
    ['n° 2572', 2572],
    ['no 2572', 2572],
    ['#2572', 2572],
    ['999999999', 999999999],
  ])('"%s" vira o número %s', (search, expected) => {
    expect(parseQuoteNumberSearch(search)).toBe(expected);
  });

  test.each(['Maria', 'Maria 2', '25-72', '0', '000', '1234567890', '', null])('"%s" não é um número de orçamento', (search) => {
    expect(parseQuoteNumberSearch(search)).toBeNull();
  });
});
