import { calculateItemSubtotal, calculateItemsTotal } from '../../src/utils/quote-pricing.js';

describe('Cálculo de subtotal por item', () => {
  test.each([
    ['2', '10.00', '20.00'],
    ['2.5', '19.99', '49.98'],
    ['0.125', '80.00', '10.00'],
    ['3', '0.10', '0.30'],
    [' 2.500 ', ' 19.99 ', '49.98'],
  ])('quantidade %s e preço %s devem resultar em %s', (quantity, unitPrice, expectedSubtotal) => {
    expect(calculateItemSubtotal(quantity, unitPrice)).toBe(expectedSubtotal);
  });

  test('deve aceitar o maior valor monetário permitido', () => {
    expect(calculateItemSubtotal('1', '9999999999.99')).toBe('9999999999.99');
  });

  test.each([
    ['quantidade zero', '0', '10.00'],
    ['quantidade negativa', '-1', '10.00'],
    ['quantidade com mais de três casas', '1.2345', '10.00'],
    ['quantidade acima do limite', '1000000000', '10.00'],
    ['preço zero', '1', '0.00'],
    ['preço negativo', '1', '-10.00'],
    ['preço com mais de duas casas', '1', '10.001'],
    ['preço acima do limite', '1', '10000000000.00'],
    ['vírgula no contrato da API', '1', '10,50'],
    ['valor não numérico', '1', 'NaN'],
    ['valor infinito', '1', 'Infinity'],
    ['quantidade numérica em vez de texto', 2.5, '10.00'],
    ['preço numérico em vez de texto', '1', 10],
    ['preço ausente', '1', null],
  ])('deve rejeitar %s', (_scenario, quantity, unitPrice) => {
    expect(() => {
      calculateItemSubtotal(quantity, unitPrice);
    }).toThrow();
  });

  test('deve rejeitar subtotal acima do limite monetário', () => {
    expect(() => {
      calculateItemSubtotal('2', '9999999999.99');
    }).toThrow();
  });
});

describe('Cálculo do total pelos itens', () => {
  test('deve somar valores em centavos sem imprecisão', () => {
    const items = [
      { quantity: '1', unitPrice: '0.10' },
      { quantity: '1', unitPrice: '0.20' },
    ];

    expect(calculateItemsTotal(items)).toBe('0.30');
  });

  test('deve somar os subtotais já arredondados', () => {
    const items = [
      { quantity: '2.5', unitPrice: '19.99' },
      { quantity: '2.5', unitPrice: '19.99' },
    ];

    expect(calculateItemsTotal(items)).toBe('99.96');
  });

  test('deve rejeitar uma lista sem itens', () => {
    expect(() => calculateItemsTotal([])).toThrow();
  });

  test('deve rejeitar total acima do limite monetário', () => {
    const items = [
      { quantity: '1', unitPrice: '9999999999.99' },
      { quantity: '1', unitPrice: '0.01' },
    ];

    expect(() => calculateItemsTotal(items)).toThrow();
  });

  test('deve rejeitar total que resulte em zero após arredondamento', () => {
    const items = [{ quantity: '0.001', unitPrice: '0.01' }];

    expect(() => calculateItemsTotal(items)).toThrow();
  });
});
