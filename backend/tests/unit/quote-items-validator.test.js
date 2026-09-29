import { validateQuoteItemsInput } from '../../src/validators/quote-items.js';

function buildInput(pricingMode = 'FIXED_TOTAL') {
  const input = {
    pricingMode,
    items: [
      {
        description: 'Cabo elétrico',
        quantity: '2.5',
      },
    ],
  };

  if (pricingMode === 'ITEMIZED') {
    input.items[0].unitPrice = '19.99';
  } else {
    input.totalAmount = '1000.00';
  }

  return input;
}

function expectFieldError(input, field) {
  const errors = validateQuoteItemsInput(input);

  expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
}

describe('Validação dos itens e da forma de cobrança', () => {
  test('deve aceitar valor global sem preços individuais', () => {
    expect(validateQuoteItemsInput(buildInput())).toEqual([]);
  });

  test('deve aceitar preço por item com quantidade fracionada', () => {
    expect(validateQuoteItemsInput(buildInput('ITEMIZED'))).toEqual([]);
  });

  test('deve aceitar preço individual null no modo global', () => {
    const input = buildInput();
    input.items[0].unitPrice = null;

    expect(validateQuoteItemsInput(input)).toEqual([]);
  });

  test('deve rejeitar uma forma de cobrança inválida', () => {
    const input = buildInput();
    input.pricingMode = 'INVALID';

    expectFieldError(input, 'pricingMode');
  });

  test('deve exigir a forma de cobrança', () => {
    const input = buildInput();
    delete input.pricingMode;

    expectFieldError(input, 'pricingMode');
  });

  test.each([
    ['ausentes', undefined],
    ['uma lista vazia', []],
  ])('deve rejeitar itens %s', (_scenario, items) => {
    const input = buildInput();
    input.items = items;

    expectFieldError(input, 'items');
  });

  test('deve rejeitar uma linha que não seja um objeto', () => {
    const input = buildInput();
    input.items = [null];

    expectFieldError(input, 'items[0]');
  });

  test.each([
    ['descrição vazia', { description: '' }, 'description'],
    ['quantidade zero', { quantity: '0' }, 'quantity'],
    ['quantidade com duas casas', { quantity: '1.25' }, 'quantity'],
    ['quantidade com três casas', { quantity: '1.255' }, 'quantity'],
    ['preço zero', { unitPrice: '0.00' }, 'unitPrice'],
    ['preço ausente', { unitPrice: undefined }, 'unitPrice'],
  ])('deve rejeitar %s', (_scenario, overrides, field) => {
    const input = buildInput('ITEMIZED');

    input.items[0] = {
      ...input.items[0],
      ...overrides,
    };

    expectFieldError(input, `items[0].${field}`);
  });

  test.each(['0.00', '10.00'])('não deve aceitar preço individual %s no modo global', (unitPrice) => {
    const input = buildInput();
    input.items[0].unitPrice = unitPrice;

    expectFieldError(input, 'items[0].unitPrice');
  });

  test('deve rejeitar total global zero', () => {
    const input = buildInput();
    input.totalAmount = '0.00';

    expectFieldError(input, 'totalAmount');
  });

  test('não deve aceitar total informado no modo por item', () => {
    const input = buildInput('ITEMIZED');
    input.totalAmount = '49.98';

    expectFieldError(input, 'totalAmount');
  });

  test('não deve aceitar posição definida pelo cliente da API', () => {
    const input = buildInput();
    input.items[0].position = 1;

    expectFieldError(input, 'items[0].position');
  });

  test('deve rejeitar total calculado acima do limite', () => {
    const input = buildInput('ITEMIZED');

    input.items = [
      {
        description: 'Primeiro item',
        quantity: '1',
        unitPrice: '9999999999.99',
      },
      {
        description: 'Segundo item',
        quantity: '1',
        unitPrice: '0.01',
      },
    ];

    expectFieldError(input, 'totalAmount');
  });

  test('deve rejeitar total calculado que arredonde para zero', () => {
    const input = buildInput('ITEMIZED');
    input.items[0].quantity = '0.1';
    input.items[0].unitPrice = '0.01';

    expectFieldError(input, 'totalAmount');
  });

  test.each(['ITEMIZED', 'FIXED_TOTAL'])('deve exigir uma casa decimal também no modo %s', (pricingMode) => {
    const input = buildInput(pricingMode);
    input.items[0].quantity = '2.55';

    expectFieldError(input, 'items[0].quantity');
  });

  test.each(['1', '2.5', '0.1'])('deve aceitar a quantidade %s no novo limite', (quantity) => {
    const input = buildInput();
    input.items[0].quantity = quantity;

    expect(validateQuoteItemsInput(input)).toEqual([]);
  });
});
