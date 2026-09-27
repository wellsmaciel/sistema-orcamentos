import { validateQuoteId, validateQuoteInput, validateQuoteUpdateInput } from '../../src/validators/quote.js';

const CURRENT_DATE = '2026-09-27';

function buildValidInput() {
  return {
    clientId: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Execução do serviço descrito pelo prestador.',
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
});
