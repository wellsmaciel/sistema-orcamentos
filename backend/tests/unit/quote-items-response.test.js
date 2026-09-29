import { serializeQuoteItems } from '../../src/utils/quote-items-response.js';

function buildItem(overrides = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    quoteId: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Cabo elétrico',
    quantity: '2.500',
    unitPrice: '19.99',
    position: 1,
    created_at: new Date('2026-09-29T10:00:00Z'),
    updated_at: new Date('2026-09-29T10:00:00Z'),
    ...overrides,
  };
}

describe('Serialização dos itens do orçamento', () => {
  test('deve calcular o subtotal exato e expor somente os campos do contrato', () => {
    expect(serializeQuoteItems({ pricingMode: 'ITEMIZED', items: [buildItem()] })).toEqual([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Cabo elétrico',
        quantity: '2.5',
        unitPrice: '19.99',
        subtotal: '49.98',
        position: 1,
      },
    ]);
  });

  test('deve devolver preço e subtotal null no modo global, sem atribuir preço zero', () => {
    const items = serializeQuoteItems({ pricingMode: 'FIXED_TOTAL', items: [buildItem({ unitPrice: null })] });

    expect(items[0].unitPrice).toBeNull();
    expect(items[0].subtotal).toBeNull();
    expect(items[0].quantity).toBe('2.5');
    expect(items[0]).not.toHaveProperty('quoteId');
    expect(items[0]).not.toHaveProperty('created_at');
    expect(items[0]).not.toHaveProperty('updated_at');
  });

  test('deve ordenar pela posição sem alterar os itens originais', () => {
    const first = buildItem({ position: 2 });
    const second = buildItem({ id: '550e8400-e29b-41d4-a716-446655440002', position: 1 });
    const originalItems = [first, second];
    const before = structuredClone(originalItems);

    const items = serializeQuoteItems({ pricingMode: 'ITEMIZED', items: originalItems });

    expect(items.map((item) => item.position)).toEqual([1, 2]);
    expect(originalItems).toEqual(before);
    expect(items[0]).not.toBe(second);
  });

  test('deve permitir um subtotal que arredonde para zero', () => {
    const items = serializeQuoteItems({
      pricingMode: 'ITEMIZED',
      items: [buildItem({ quantity: '0.001', unitPrice: '0.01' })],
    });

    expect(items[0].subtotal).toBe('0.00');
  });

  test('deve preservar a quantidade e o subtotal de registros históricos, sem arredondar a quantidade', () => {
    const items = serializeQuoteItems({ pricingMode: 'ITEMIZED', items: [buildItem({ quantity: '1.250', unitPrice: '8.00' })] });

    expect(items[0].quantity).toBe('1.25');
    expect(items[0].subtotal).toBe('10.00');
  });

  test('deve retornar lista vazia para registros globais históricos sem itens', () => {
    expect(serializeQuoteItems({ pricingMode: 'FIXED_TOTAL', items: [] })).toEqual([]);
  });

  test('não deve esconder uma consulta que deixou de carregar os itens', () => {
    expect(() => serializeQuoteItems({ pricingMode: 'FIXED_TOTAL' })).toThrow(TypeError);
  });

  test('deve rejeitar uma forma de cobrança desconhecida', () => {
    expect(() => serializeQuoteItems({ pricingMode: 'OTHER', items: [buildItem()] })).toThrow(RangeError);
  });

  test('não deve converter quantidades numéricas e introduzir perda de precisão', () => {
    expect(() => serializeQuoteItems({ pricingMode: 'ITEMIZED', items: [buildItem({ quantity: 2.5 })] })).toThrow(TypeError);
  });
});
