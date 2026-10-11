import { validateCompanyInput } from '../../src/validators/company.js';

function buildValidInput() {
  return {
    name: 'Prestador de Teste Serviços',
    email: 'contato@example.com',
    phone: '11999999999',
    taxId: '12.345.678/0001-95',
    address: {
      street: 'Rua de Teste',
      number: '100',
      complement: 'Sala 2',
      postalCode: '01001-000',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
    },
  };
}

describe('Validação dos dados profissionais', () => {
  test('deve aceitar dados profissionais completos', () => {
    const errors = validateCompanyInput(buildValidInput());

    expect(errors).toEqual([]);
  });

  test('deve aceitar os dados obrigatórios sem CPF, CNPJ ou endereço', () => {
    const errors = validateCompanyInput({
      name: 'Profissional Autônomo',
      email: 'profissional@example.com',
      phone: '11999999999',
    });

    expect(errors).toEqual([]);
  });

  test('deve informar os campos obrigatórios ausentes', () => {
    const errors = validateCompanyInput({});

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' }), expect.objectContaining({ field: 'email' }), expect.objectContaining({ field: 'phone' })]),
    );
  });

  test('deve rejeitar e-mail inválido', () => {
    const errors = validateCompanyInput({
      ...buildValidInput(),
      email: 'email-invalido',
    });

    expect(errors).toContainEqual({
      field: 'email',
      message: 'Informe um e-mail válido.',
    });
  });

  test('deve rejeitar CPF ou CNPJ com quantidade inválida de dígitos', () => {
    const errors = validateCompanyInput({
      ...buildValidInput(),
      taxId: '1234',
    });

    expect(errors).toContainEqual({
      field: 'taxId',
      message: 'Informe um CPF com 11 números ou um CNPJ com 14 caracteres.',
    });
  });

  test('deve aceitar CPF e CNPJ somente com números ou já formatados', () => {
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '12345678909' })).toEqual([]);
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '12.345.678/0001-95' })).toEqual([]);
  });

  test('deve conferir os dígitos verificadores e dizer qual documento está errado', () => {
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '123.456.789-01' })).toContainEqual({
      field: 'taxId',
      message: 'CPF inválido: confira os números.',
    });
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '12.345.678/0001-90' })).toContainEqual({
      field: 'taxId',
      message: 'CNPJ inválido: confira os números e as letras.',
    });
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '111.111.111-11' })).toContainEqual(expect.objectContaining({ field: 'taxId' }));
  });

  test('deve aceitar o CNPJ alfanumérico, com o exemplo da Receita Federal', () => {
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '12.ABC.345/01DE-35' })).toEqual([]);
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '12abc34501de35' })).toEqual([]);
    expect(validateCompanyInput({ ...buildValidInput(), taxId: '12.ABC.345/01DE-34' })).toContainEqual(expect.objectContaining({ field: 'taxId' }));
  });

  test('deve rejeitar texto junto do CPF ou CNPJ', () => {
    expect(validateCompanyInput({ ...buildValidInput(), taxId: 'CNPJ 12345678901234' })).toContainEqual({
      field: 'taxId',
      message: 'Informe um CPF com 11 números ou um CNPJ com 14 caracteres.',
    });
  });

  test('deve exigir o endereço completo quando ele for informado', () => {
    const errors = validateCompanyInput({
      ...buildValidInput(),
      address: {
        city: 'São Paulo',
      },
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'address.street' }),
        expect.objectContaining({ field: 'address.number' }),
        expect.objectContaining({ field: 'address.postalCode' }),
        expect.objectContaining({ field: 'address.district' }),
        expect.objectContaining({ field: 'address.state' }),
      ]),
    );
  });

  test('deve rejeitar propriedades não previstas no contrato', () => {
    const errors = validateCompanyInput({
      ...buildValidInput(),
      logo: 'logo.png',
    });

    expect(errors).toContainEqual({
      field: 'logo',
      message: 'Este campo não é permitido.',
    });
  });
});

describe('telefone comercial', () => {
  test('rejeita telefone sem DDD, com exemplo do formato', () => {
    expect(validateCompanyInput({ ...buildValidInput(), phone: '3333-4444' })).toEqual([
      { field: 'phone', message: 'Informe o telefone com DDD. Celular: 9 dígitos depois do DDD, começando com 9, por exemplo 21999998888. Fixo: 8 dígitos depois do DDD, começando com 2, 3, 4 ou 5, por exemplo 2133334444.' },
    ]);
  });

  test('aceita fixo ou celular com DDD', () => {
    expect(validateCompanyInput({ ...buildValidInput(), phone: '(11) 3333-4444' })).toEqual([]);
    expect(validateCompanyInput({ ...buildValidInput(), phone: '21999998888' })).toEqual([]);
  });
});
