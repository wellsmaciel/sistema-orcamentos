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
  assert.equal(labelField('serviceAddress.street'), 'Rua');
});

test('sem detalhes, usa a mensagem da API ou a mensagem padrão', () => {
  assert.equal(describeApiError({ message: 'Cliente não encontrado.' }, 'Falhou.'), 'Cliente não encontrado.');
  assert.equal(describeApiError({}, 'Falhou.'), 'Falhou.');
  assert.equal(describeApiError(null, 'Falhou.'), 'Falhou.');
});

test('campo desconhecido aparece como veio da API', () => {
  assert.equal(labelField('campoNovo'), 'campoNovo');
});
