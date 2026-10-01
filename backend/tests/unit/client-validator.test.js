import { validateClientInput } from '../../src/validators/client.js';

const validClient = {
  name: 'Cliente de Teste',
  email: 'cliente@example.com',
  phone: '11999999999',
  address: {
    street: 'Rua de Teste',
    number: '100',
    complement: 'Sala 2',
    postalCode: '01001000',
    district: 'Centro',
    city: 'São Paulo',
    state: 'SP',
  },
};

describe('Validação do cadastro de cliente', () => {
  test('deve aceitar um cliente válido', () => {
    const errors = validateClientInput(validClient);

    expect(errors).toEqual([]);
  });

  test('deve informar os campos obrigatórios ausentes', () => {
    const errors = validateClientInput({});

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'phone' }),
        expect.objectContaining({ field: 'address' }),
      ]),
    );
  });

  test('deve rejeitar e-mail inválido', () => {
    const errors = validateClientInput({
      ...validClient,
      email: 'email-invalido',
    });

    expect(errors).toContainEqual({
      field: 'email',
      message: 'Informe um e-mail válido.',
    });
  });

  test('deve rejeitar propriedades não previstas no contrato', () => {
    const errors = validateClientInput({
      ...validClient,
      unexpectedField: 'valor',
    });

    expect(errors).toContainEqual({
      field: 'unexpectedField',
      message: 'Este campo não é permitido.',
    });
  });
});

describe('telefone do cliente', () => {
  test('aceita telefone com DDD em vários formatos', () => {
    for (const phone of ['(21) 99999-8888', '+55 21 99999-8888', '(11) 3333-4444']) {
      expect(validateClientInput({ ...validClient, phone })).toEqual([]);
    }
  });

  test('rejeita telefone sem DDD ou com dígitos a mais, com exemplo do formato', () => {
    for (const phone of ['99999-8888', '21-999999-99999']) {
      expect(validateClientInput({ ...validClient, phone })).toEqual([
        { field: 'phone', message: 'Informe o telefone com DDD, por exemplo (21) 99999-8888.' },
      ]);
    }
  });
});
