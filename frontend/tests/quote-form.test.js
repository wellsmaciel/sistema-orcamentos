import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildDescriptionReviewRequest, buildQuoteRequest, calculateFormItemSubtotal, formatQuoteMoney, formatQuoteQuantity, getItemsPricingPreview, isBlankFormItem, normalizeDecimalInput, normalizeMoneyInput } from '../src/utils/quote-form.js';
import { calculateItemSubtotal, calculateItemsTotal } from '../../backend/src/utils/quote-pricing.js';
import { validateQuoteInput, validateQuoteUpdateInput } from '../../backend/src/validators/quote.js';
import { validateQuoteDescriptionReviewInput } from '../../backend/src/validators/quote-description-review.js';

function buildFormData(pricingMode = 'FIXED_TOTAL') {
  return {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Execução do serviço descrito pelo prestador.',
    pricingMode,
    items: [{ formId: 'linha-local', id: 'id-antigo', quoteId: 'orcamento-antigo', description: '  Cabo elétrico  ', quantity: '2,5', unitPrice: '19,99', subtotal: '49.98', position: 1 }],
    totalAmount: '1000,00',
    serviceDate: '2099-10-15',
    street: 'Rua de Teste',
    number: '100',
    complement: '',
    postalCode: '01001-000',
    district: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    locationNotes: '',
  };
}

describe('Envio do formulário de orçamento', () => {
  for (const pricingMode of ['FIXED_TOTAL', 'ITEMIZED']) {
    test(`cria um contrato válido no modo ${pricingMode}`, () => {
      const body = buildQuoteRequest(buildFormData(pricingMode));
      assert.deepEqual(validateQuoteInput(body, '2099-09-27'), []);
      assert.equal(body.clientId, '550e8400-e29b-41d4-a716-446655440000');
      assert.equal(body.items[0].quantity, '2.5');
      assert.equal(body.items[0].description, 'Cabo elétrico');
      assert.deepEqual(Object.keys(body.items[0]), pricingMode === 'ITEMIZED' ? ['description', 'quantity', 'unitPrice'] : ['description', 'quantity']);
    });

    test(`edita sem enviar clientId no modo ${pricingMode}`, () => {
      const body = buildQuoteRequest(buildFormData(pricingMode), { isEditing: true });
      assert.equal(Object.hasOwn(body, 'clientId'), false);
      assert.deepEqual(validateQuoteUpdateInput(body, '2099-09-27'), []);
    });
  }

  test('envia total global positivo sem preços individuais, mesmo que existam preços ocultos no estado', () => {
    const body = buildQuoteRequest(buildFormData());
    assert.equal(body.totalAmount, '1000.00');
    assert.equal(Object.hasOwn(body.items[0], 'unitPrice'), false);
  });

  test('não envia total manual no modo por item', () => {
    const body = buildQuoteRequest(buildFormData('ITEMIZED'));
    assert.equal(Object.hasOwn(body, 'totalAmount'), false);
    assert.equal(body.items[0].unitPrice, '19.99');
  });

  test('preserva ordem e dados do estado sem mutação', () => {
    const formData = buildFormData('ITEMIZED');
    formData.items.push({ formId: 'segunda-linha', description: 'Mão de obra', quantity: '1', unitPrice: '100' });
    const original = structuredClone(formData);
    const body = buildQuoteRequest(formData);
    assert.deepEqual(body.items.map((item) => item.description), ['Cabo elétrico', 'Mão de obra']);
    assert.deepEqual(formData, original);
  });

  test('troca entre modos sem levar o total manual nem preços ao contrato errado', () => {
    const formData = buildFormData('ITEMIZED');
    assert.equal(Object.hasOwn(buildQuoteRequest(formData), 'totalAmount'), false);
    formData.pricingMode = 'FIXED_TOTAL';
    assert.equal(Object.hasOwn(buildQuoteRequest(formData).items[0], 'unitPrice'), false);
    formData.pricingMode = 'ITEMIZED';
    assert.equal(buildQuoteRequest(formData).items[0].unitPrice, '19.99');
  });

  for (const [scenario, change] of [
    ['sem itens', (data) => { data.items = []; }],
    ['modo inválido', (data) => { data.pricingMode = 'OTHER'; }],
    ['descrição vazia do item', (data) => { data.items[0].description = '  '; }],
    ['descrição muito longa do item', (data) => { data.items[0].description = 'x'.repeat(501); }],
    ['quantidade zero', (data) => { data.items[0].quantity = '0'; }],
    ['quantidade negativa', (data) => { data.items[0].quantity = '-1'; }],
    ['quantidade com duas casas', (data) => { data.items[0].quantity = '1,25'; }],
    ['quantidade com três casas', (data) => { data.items[0].quantity = '1,255'; }],
    ['quantidade acima do limite', (data) => { data.items[0].quantity = '1000000000'; }],
    ['valor global zero', (data) => { data.totalAmount = '0,00'; }],
    ['valor global com três casas', (data) => { data.totalAmount = '1,001'; }],
    ['valor global com letras', (data) => { data.totalAmount = 'mil reais'; }],
  ]) {
    test(`rejeita ${scenario}`, () => {
      const data = buildFormData();
      change(data);
      assert.throws(() => buildQuoteRequest(data), RangeError);
    });
  }

  for (const unitPrice of ['', '0', '0,00', '-1', '19,999', '10000000000', 'NaN', 'Infinity']) {
    test(`rejeita preço individual inválido: ${JSON.stringify(unitPrice)}`, () => {
      const data = buildFormData('ITEMIZED');
      data.items[0].unitPrice = unitPrice;
      assert.throws(() => buildQuoteRequest(data), RangeError);
    });
  }

  test('não exige preço individual no modo global', () => {
    const data = buildFormData();
    delete data.items[0].unitPrice;
    assert.deepEqual(validateQuoteInput(buildQuoteRequest(data), '2099-09-27'), []);
  });

  test('rejeita total por itens que arredonda para zero', () => {
    const data = buildFormData('ITEMIZED');
    data.items[0].quantity = '0,1';
    data.items[0].unitPrice = '0,01';
    assert.throws(() => buildQuoteRequest(data), /total dos itens/);
  });

  test('rejeita o estouro do total e do subtotal', () => {
    const data = buildFormData('ITEMIZED');
    data.items = [
      { description: 'Item A', quantity: '1', unitPrice: '9999999999.99' },
      { description: 'Item B', quantity: '1', unitPrice: '0.01' },
    ];
    assert.throws(() => buildQuoteRequest(data), /total dos itens/);
    data.items = [{ description: 'Item A', quantity: '2', unitPrice: '9999999999.99' }];
    assert.throws(() => buildQuoteRequest(data), /total dos itens/);
  });
});

describe('Prévia monetária sem ponto flutuante', () => {
  for (const [quantity, unitPrice, expected] of [
    ['2,5', '19,99', '49.98'],
    ['0.5', '0.01', '0.01'],
    ['0.1', '0.01', '0.00'],
    ['3', '0.10', '0.30'],
    ['1', '9999999999.99', '9999999999.99'],
  ]) {
    test(`${quantity} × ${unitPrice} = ${expected}, igual ao backend`, () => {
      const subtotal = calculateFormItemSubtotal(quantity, unitPrice);
      assert.equal(subtotal, expected);
      assert.equal(subtotal, calculateItemSubtotal(normalizeDecimalInput(quantity), normalizeDecimalInput(unitPrice)));
    });
  }

  test('soma subtotais arredondados, não o valor bruto', () => {
    const items = [{ quantity: '0.5', unitPrice: '0.01' }, { quantity: '0.5', unitPrice: '0.01' }];
    assert.deepEqual(getItemsPricingPreview(items), { subtotals: ['0.01', '0.01'], totalAmount: '0.02' });
    assert.equal(getItemsPricingPreview(items).totalAmount, calculateItemsTotal(items));
  });

  test('não apresenta um total parcial quando há uma linha incompleta', () => {
    assert.deepEqual(getItemsPricingPreview([{ quantity: '1', unitPrice: '10' }, { quantity: '', unitPrice: '' }]), { subtotals: ['10.00', null], totalAmount: null });
  });

  test('deixa a prévia pendente com total zero, vazio ou acima do limite', () => {
    assert.equal(getItemsPricingPreview([{ quantity: '0.1', unitPrice: '0.01' }]).totalAmount, null);
    assert.equal(getItemsPricingPreview([]).totalAmount, null);
    assert.equal(getItemsPricingPreview([{ quantity: '1', unitPrice: '9999999999.99' }, { quantity: '1', unitPrice: '0.01' }]).totalAmount, null);
  });

  test('formata reais sem perder centavos e diferencia valor zero de valor ausente', () => {
    assert.equal(formatQuoteMoney('9999999999.99'), 'R$ 9.999.999.999,99');
    assert.equal(formatQuoteMoney('1000'), 'R$ 1.000,00');
    assert.equal(formatQuoteMoney('0.00'), 'R$ 0,00');
    assert.equal(formatQuoteMoney(null), '—');
  });

  test('exibe quantidade compacta sem arredondar registros antigos', () => {
    assert.equal(formatQuoteQuantity('3.000'), '3');
    assert.equal(formatQuoteQuantity('1.000'), '1');
    assert.equal(formatQuoteQuantity('2.500'), '2,5');
    assert.equal(formatQuoteQuantity('0.100'), '0,1');
    assert.equal(formatQuoteQuantity('1.250'), '1,25');
    assert.equal(formatQuoteQuantity('0.125'), '0,125');
  });
});

describe('Revisão da descrição com IA', () => {
  test('envia somente a descrição e os itens preenchidos, aceitos pelo backend', () => {
    const formData = buildFormData('ITEMIZED');
    formData.description = '  instalar 4 camera no predio  ';
    formData.items.push({ formId: 'linha-vazia', description: '   ', quantity: '1', unitPrice: '' });

    const body = buildDescriptionReviewRequest(formData);

    assert.deepEqual(body, {
      description: 'instalar 4 camera no predio',
      items: [{ description: 'Cabo elétrico', quantity: '2,5' }],
    });
    assert.deepEqual(validateQuoteDescriptionReviewInput(body), []);
  });

  test('não inclui cliente, endereço, preços ou quantidade vazia', () => {
    const formData = buildFormData('ITEMIZED');
    formData.items[0].quantity = '';

    const body = buildDescriptionReviewRequest(formData);

    assert.deepEqual(Object.keys(body), ['description', 'items']);
    assert.deepEqual(body.items, [{ description: 'Cabo elétrico' }]);
    assert.doesNotMatch(JSON.stringify(body), /550e8400|Rua de Teste|19,99/);
  });
});

describe('Linhas de item em branco', () => {
  test('ignora linhas totalmente em branco ao salvar', () => {
    const formData = buildFormData('ITEMIZED');
    formData.items.push({ formId: 'linha-vazia', description: '  ', quantity: '1', unitPrice: '' });

    const body = buildQuoteRequest(formData);

    assert.equal(body.items.length, 1);
    assert.deepEqual(validateQuoteInput(body, '2099-09-27'), []);
  });

  test('mantém o erro de uma linha parcialmente preenchida, com o número original', () => {
    const formData = buildFormData('ITEMIZED');
    formData.items.push({ formId: 'linha-vazia', description: '', quantity: '1', unitPrice: '' });
    formData.items.push({ formId: 'linha-parcial', description: '', quantity: '3', unitPrice: '10' });

    assert.throws(() => buildQuoteRequest(formData), /Item 3: informe uma descrição/);
  });

  test('exige ao menos um item preenchido', () => {
    const formData = buildFormData();
    formData.items = [{ formId: 'linha-vazia', description: '', quantity: '1', unitPrice: '' }];

    assert.throws(() => buildQuoteRequest(formData), /Informe pelo menos um item/);
  });

  test('preço oculto no valor global não impede de ignorar a linha', () => {
    assert.equal(isBlankFormItem({ description: '', quantity: '1', unitPrice: '19,99' }, 'FIXED_TOTAL'), true);
    assert.equal(isBlankFormItem({ description: '', quantity: '1', unitPrice: '19,99' }, 'ITEMIZED'), false);
    assert.equal(isBlankFormItem({ description: '', quantity: '2', unitPrice: '' }, 'FIXED_TOTAL'), false);
  });
});

describe('Valores em reais no formato brasileiro', () => {
  for (const [typed, expected] of [
    ['1.200,50', '1200.50'],
    ['1200,50', '1200.50'],
    ['1200.50', '1200.50'],
    ['R$ 1.200,50', '1200.50'],
    ['r$1.200', '1200'],
    ['1.200', '1200'],
    ['1.234.567,89', '1234567.89'],
    ['1,234.56', '1234.56'],
    [' 19,99 ', '19.99'],
    ['50', '50'],
  ]) {
    test(`"${typed}" vira ${expected}`, () => {
      assert.equal(normalizeMoneyInput(typed), expected);
    });
  }

  test('o valor global e o preço por item aceitam separador de milhar', () => {
    const fixedTotal = buildFormData();
    fixedTotal.totalAmount = 'R$ 1.000,00';
    assert.equal(buildQuoteRequest(fixedTotal).totalAmount, '1000.00');

    const itemized = buildFormData('ITEMIZED');
    itemized.items[0].unitPrice = '1.200,50';
    const request = buildQuoteRequest(itemized);
    assert.equal(request.items[0].unitPrice, '1200.50');
    assert.deepEqual(validateQuoteInput(request, '2099-09-27'), []);
  });

  test('o subtotal da prévia usa o valor convertido', () => {
    assert.equal(calculateFormItemSubtotal('2', '1.200,50'), '2401.00');
  });

  test('a mensagem de erro mostra um exemplo no formato brasileiro', () => {
    const data = buildFormData();
    data.totalAmount = '1,001';
    assert.throws(() => buildQuoteRequest(data), /1\.200,50/);
  });
});
