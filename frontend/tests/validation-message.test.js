import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeApiError, labelField } from '../src/utils/validation-message.js';

test('mostra o motivo de cada campo recusado com o nome usado na tela', () => {
  const responseBody = {
    code: 'VALIDATION_ERROR',
    message: 'Os dados informados são inválidos.',
    details: [
      { field: 'taxId', message: 'Informe um CPF ou CNPJ com 11 ou 14 dígitos.' },
      { field: 'address.postalCode', message: 'Este campo é obrigatório.' },
    ],
  };

  assert.equal(
    describeApiError(responseBody, 'Falhou.'),
    'CPF ou CNPJ: Informe um CPF ou CNPJ com 11 ou 14 dígitos. CEP: Este campo é obrigatório.',
  );
});

test('nomeia os campos dos itens do orçamento pela posição', () => {
  assert.equal(labelField('items[0].quantity'), 'Item 1 – Quantidade');
  assert.equal(labelField('items[2]'), 'Item 3');
  assert.equal(labelField('serviceAddress.street'), 'Logradouro (rua, avenida...)');
});

test('sem detalhes, usa a mensagem da API ou a mensagem padrão', () => {
  assert.equal(describeApiError({ message: 'Cliente não encontrado.' }, 'Falhou.'), 'Cliente não encontrado.');
  assert.equal(describeApiError({}, 'Falhou.'), 'Falhou.');
  assert.equal(describeApiError(null, 'Falhou.'), 'Falhou.');
});

test('campo desconhecido aparece como veio da API', () => {
  assert.equal(labelField('campoNovo'), 'campoNovo');
});

test('erro da API leva os campos recusados pelo nome usado no formulário', async () => {
  const { createApiError, toFieldErrors } = await import('../src/utils/validation-message.js');
  const responseBody = {
    code: 'VALIDATION_ERROR',
    details: [
      { field: 'address.postalCode', message: 'Este campo é obrigatório.' },
      { field: 'address.postalCode', message: 'Outro motivo do mesmo campo.' },
      { field: 'taxId', message: 'Informe um CPF ou CNPJ com 11 ou 14 dígitos.' },
    ],
  };

  assert.deepEqual(toFieldErrors(responseBody), {
    postalCode: 'Este campo é obrigatório.',
    taxId: 'Informe um CPF ou CNPJ com 11 ou 14 dígitos.',
  });

  const error = createApiError(responseBody, 'Falhou.');
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.fieldErrors.postalCode, 'Este campo é obrigatório.');
  assert.deepEqual(createApiError({ message: 'Cliente não encontrado.' }, 'Falhou.').fieldErrors, {});
});

test('campo com erro fica marcado e descrito pela dica e pelo erro', async () => {
  const { fieldErrorProps } = await import('../src/utils/form-errors.js');

  assert.deepEqual(fieldErrorProps('company-postal-code', 'Este campo é obrigatório.'), {
    'aria-invalid': true,
    'aria-describedby': 'company-postal-code-error',
    'aria-errormessage': 'company-postal-code-error',
  });
  assert.deepEqual(fieldErrorProps('company-phone', '', 'company-phone-help'), {
    'aria-invalid': false,
    'aria-describedby': 'company-phone-help',
    'aria-errormessage': undefined,
  });
});
