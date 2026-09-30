import { validateQuoteDescriptionReviewInput } from '../../src/validators/quote-description-review.js';

function buildValidInput() {
  return {
    description: 'instalar 4 camera no predio e configurar o gravador',
    items: [
      { description: 'Câmera', quantity: '4' },
      { description: 'Gravador digital' },
    ],
  };
}

describe('validateQuoteDescriptionReviewInput', () => {
  test('aceita descrição com itens', () => {
    expect(validateQuoteDescriptionReviewInput(buildValidInput())).toEqual([]);
  });

  test('aceita descrição sem itens', () => {
    expect(validateQuoteDescriptionReviewInput({ description: 'Troca de disjuntor' })).toEqual([]);
  });

  test('rejeita dados do cliente para que não sejam enviados ao serviço de IA', () => {
    const input = { ...buildValidInput(), clientName: 'Maria', clientEmail: 'maria@example.com' };

    expect(validateQuoteDescriptionReviewInput(input)).toEqual([
      { field: 'clientName', message: 'Este campo não é permitido.' },
      { field: 'clientEmail', message: 'Este campo não é permitido.' },
    ]);
  });

  test('exige a descrição e limita seu tamanho', () => {
    expect(validateQuoteDescriptionReviewInput({ description: '   ' })).toEqual([
      { field: 'description', message: 'Este campo é obrigatório.' },
    ]);
    expect(validateQuoteDescriptionReviewInput({ description: 'a'.repeat(10001) })).toEqual([
      { field: 'description', message: 'Este campo deve possuir no máximo 10000 caracteres.' },
    ]);
  });

  test('valida a lista de itens', () => {
    expect(validateQuoteDescriptionReviewInput({ description: 'Texto', items: 'Câmera' })).toEqual([
      { field: 'items', message: 'Informe os itens como uma lista.' },
    ]);

    const tooManyItems = Array.from({ length: 51 }, () => ({ description: 'Item' }));
    expect(validateQuoteDescriptionReviewInput({ description: 'Texto', items: tooManyItems })).toEqual([
      { field: 'items', message: 'Informe no máximo 50 itens.' },
    ]);
  });

  test('aceita apenas descrição e quantidade em cada item', () => {
    const input = {
      description: 'Texto',
      items: [
        { description: 'Câmera', quantity: 4, unitPrice: '100.00' },
        { description: '' },
      ],
    };

    expect(validateQuoteDescriptionReviewInput(input)).toEqual([
      { field: 'items[0].unitPrice', message: 'Este campo não é permitido.' },
      { field: 'items[0].quantity', message: 'Informe a quantidade como texto com até 20 caracteres.' },
      { field: 'items[1].description', message: 'Este campo é obrigatório.' },
    ]);
  });

  test('rejeita corpo que não seja um objeto', () => {
    expect(validateQuoteDescriptionReviewInput(['Texto'])).toEqual([
      { field: 'body', message: 'O corpo da requisição deve ser um objeto.' },
    ]);
  });
});
