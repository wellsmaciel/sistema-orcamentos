import { getCurrentDate, validateQuoteId, validateQuoteInput, validateQuoteUpdateInput, validateQuoteResponseInput } from '../../src/validators/quote.js';

const CURRENT_DATE = '2026-09-27';

function buildValidInput() {
  return {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Execução do serviço descrito pelo prestador.',
    pricingMode: 'FIXED_TOTAL',
    items: [
      {
        description: 'Mão de obra',
        quantity: '1',
      },
    ],
    totalAmount: '1500.50',
    serviceDate: '2026-10-15',
    serviceAddress: {
      street: 'Rua de Teste',
      number: '100',
      complement: '',
      postalCode: '01001-000',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
    },
    locationNotes: 'Entrar em contato antes da visita.',
  };
}

describe('Validação de orçamento', () => {
  test('deve aceitar um orçamento válido', () => {
    const errors = validateQuoteInput(buildValidInput(), CURRENT_DATE);

    expect(errors).toEqual([]);
  });

  test('deve indicar os campos obrigatórios ausentes', () => {
    const errors = validateQuoteInput({}, CURRENT_DATE);

    expect(errors).toEqual(
      expect.arrayContaining([
        {
          field: 'clientId',
          message: 'Este campo é obrigatório.',
        },
        {
          field: 'serviceAddress',
          message: 'O endereço do serviço é obrigatório.',
        },
      ]),
    );
  });

  test('deve rejeitar valor total igual a zero', () => {
    const input = buildValidInput();
    input.totalAmount = '0.00';

    const errors = validateQuoteInput(input, CURRENT_DATE);

    expect(errors).toContainEqual({
      field: 'totalAmount',
      message: 'O valor total deve ser maior que zero.',
    });
  });

  test.each([
    ['uma data inexistente', '2026-02-30', 'Informe uma data válida.'],
    ['uma data passada', '2026-09-26', 'A data do serviço não pode estar no passado.'],
  ])('deve rejeitar %s', (_scenario, serviceDate, message) => {
    const input = buildValidInput();
    input.serviceDate = serviceDate;

    const errors = validateQuoteInput(input, CURRENT_DATE);

    expect(errors).toContainEqual({
      field: 'serviceDate',
      message,
    });
  });

  test('deve rejeitar propriedades não previstas no contrato', () => {
    const input = {
      ...buildValidInput(),
      status: 'SENT',
    };

    const errors = validateQuoteInput(input, CURRENT_DATE);

    expect(errors).toContainEqual({
      field: 'status',
      message: 'Este campo não é permitido.',
    });
  });
  test('deve aceitar a atualização sem clientId', () => {
    const input = buildValidInput();

    delete input.clientId;

    const errors = validateQuoteUpdateInput(input, CURRENT_DATE);

    expect(errors).toEqual([]);
  });

  test('deve rejeitar a troca do cliente na atualização', () => {
    const input = buildValidInput();

    const errors = validateQuoteUpdateInput(input, CURRENT_DATE);

    expect(errors).toContainEqual({
      field: 'clientId',
      message: 'Este campo não é permitido.',
    });
  });
  test('deve aceitar um identificador de orçamento válido', () => {
    const errors = validateQuoteId('550e8400-e29b-41d4-a716-446655440000');

    expect(errors).toEqual([]);
  });

  test('deve rejeitar um identificador de orçamento inválido', () => {
    const errors = validateQuoteId('identificador-invalido');

    expect(errors).toEqual([
      {
        field: 'quoteId',
        message: 'Informe um identificador válido.',
      },
    ]);
  });
  test('deve aceitar a aprovação de um orçamento', () => {
    const errors = validateQuoteResponseInput({
      decision: 'ACCEPTED',
    });

    expect(errors).toEqual([]);
  });

  test('deve aceitar a recusa com motivo', () => {
    const errors = validateQuoteResponseInput({
      decision: 'REJECTED',
      reason: 'O valor precisa ser revisto.',
    });

    expect(errors).toEqual([]);
  });

  test('deve rejeitar uma decisão inválida', () => {
    const errors = validateQuoteResponseInput({
      decision: 'PENDING',
    });

    expect(errors).toContainEqual({
      field: 'decision',
      message: 'Informe ACCEPTED ou REJECTED.',
    });
  });

  test('não deve aceitar motivo em uma aprovação', () => {
    const errors = validateQuoteResponseInput({
      decision: 'ACCEPTED',
      reason: 'Texto indevido.',
    });

    expect(errors).toContainEqual({
      field: 'reason',
      message: 'O motivo deve ser informado somente em caso de recusa.',
    });
  });
  describe('Validação do orçamento com itens', () => {
    test('deve aceitar criação por item sem total informado', () => {
      const input = buildValidInput();

      input.pricingMode = 'ITEMIZED';
      input.items[0].unitPrice = '1500.50';
      delete input.totalAmount;

      expect(validateQuoteInput(input, CURRENT_DATE)).toEqual([]);
    });

    test('deve aceitar edição por item sem trocar o cliente', () => {
      const input = buildValidInput();

      input.pricingMode = 'ITEMIZED';
      input.items[0].unitPrice = '1500.50';
      delete input.totalAmount;
      delete input.clientId;

      expect(validateQuoteUpdateInput(input, CURRENT_DATE)).toEqual([]);
    });

    test('deve exigir itens também no validador principal', () => {
      const input = buildValidInput();
      delete input.items;

      expect(validateQuoteInput(input, CURRENT_DATE)).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'items' })]));
    });
  });
});

describe('Data de hoje no horário de Brasília', () => {
  test.each([
    ['2026-10-03T01:30:00.000Z', '2026-10-02'], // 22h30 de 02/10 em Brasília; em UTC já é 03/10
    ['2026-10-03T02:59:59.000Z', '2026-10-02'], // 23h59 em Brasília
    ['2026-10-03T03:00:00.000Z', '2026-10-03'], // meia-noite em Brasília
    ['2026-10-03T15:00:00.000Z', '2026-10-03'], // meio-dia em Brasília
  ])('em %s (UTC), hoje é %s', (instant, expected) => {
    expect(getCurrentDate(new Date(instant))).toBe(expected);
  });

  test('às 22h30 de Brasília, a data de hoje ainda é aceita para o serviço', () => {
    const input = { ...buildValidInput(), serviceDate: '2026-10-02' };

    expect(validateQuoteInput(input, getCurrentDate(new Date('2026-10-03T01:30:00.000Z')))).toEqual([]);
  });
});
