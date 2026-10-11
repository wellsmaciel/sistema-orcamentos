import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBrazilianPhone, phoneErrorMessage, standardizeBrazilianPhone } from '../src/utils/phone.js';
import {
  normalizeBrazilianPhone as backendNormalizeBrazilianPhone,
  standardizeBrazilianPhone as backendStandardizeBrazilianPhone,
  phoneErrorMessage as backendPhoneErrorMessage,
} from '../../backend/src/utils/phone.js';

const PHONE_INPUTS = [
  '(21) 99999-8888', '21999998888', '+55 21 99999-8888', '55 (11) 3333-4444', '(11) 3333-4444', '  11 2345 6789  ',
  '99999-8888', '021 99999-8888', '(21) 89999-8888', '(01) 99999-8888', '(21) 6333-4444', '21-999999-99999', '', 'abc',
  '1165648484', '(11) 6465-8888', '+55 11 6564-8484',
];

test('o frontend e o backend aplicam a mesma regra de telefone', () => {
  for (const input of PHONE_INPUTS) {
    assert.equal(standardizeBrazilianPhone(input), backendStandardizeBrazilianPhone(input), `formato divergente para "${input}"`);
    assert.equal(normalizeBrazilianPhone(input), backendNormalizeBrazilianPhone(input), `dígitos divergentes para "${input}"`);
    assert.equal(phoneErrorMessage(input), backendPhoneErrorMessage(input), `mensagem divergente para "${input}"`);
  }
});

test('padroniza celular e fixo com DDD', () => {
  assert.equal(standardizeBrazilianPhone('21999998888'), '(21) 99999-8888');
  assert.equal(standardizeBrazilianPhone('+55 11 3333-4444'), '(11) 3333-4444');
  assert.equal(standardizeBrazilianPhone('99999-8888'), null);
});

test('celular no formato antigo, sem o 9, recebe a mensagem com o número corrigido', () => {
  assert.equal(normalizeBrazilianPhone('1165648484'), null);
  assert.equal(phoneErrorMessage('1165648484'), 'Parece um celular sem o 9 na frente. Celulares têm 9 dígitos depois do DDD, por exemplo (11) 96564-8484.');
  assert.equal(phoneErrorMessage('+55 11 6465-8888'), 'Parece um celular sem o 9 na frente. Celulares têm 9 dígitos depois do DDD, por exemplo (11) 96465-8888.');
  assert.match(phoneErrorMessage('99999-8888'), /^Informe o telefone com DDD\./);
});
