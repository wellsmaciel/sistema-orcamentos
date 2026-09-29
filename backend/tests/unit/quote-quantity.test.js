import { normalizeStoredQuantity } from '../../src/utils/quote-quantity.js';

describe('Quantidade armazenada sem zeros desnecessários', () => {
  test.each([
    ['3.000', '3'],
    ['1.000', '1'],
    ['2.500', '2.5'],
    ['2.0', '2'],
    ['2.5', '2.5'],
    [' 2.500 ', '2.5'],
    ['0.100', '0.1'],
    ['1.250', '1.25'],
    ['0.125', '0.125'],
  ])('deve normalizar %s para %s sem arredondar', (value, expected) => {
    expect(normalizeStoredQuantity(value)).toBe(expected);
  });

  test('deve rejeitar quantidade numérica para evitar conversão imprecisa', () => {
    expect(() => normalizeStoredQuantity(2.5)).toThrow(TypeError);
  });
});
