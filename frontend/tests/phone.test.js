import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBrazilianPhone, standardizeBrazilianPhone } from '../src/utils/phone.js';
import {
  normalizeBrazilianPhone as backendNormalizeBrazilianPhone,
  standardizeBrazilianPhone as backendStandardizeBrazilianPhone,
} from '../../backend/src/utils/phone.js';

const PHONE_INPUTS = [
  '(21) 99999-8888', '21999998888', '+55 21 99999-8888', '55 (11) 3333-4444', '(11) 3333-4444', '  11 2345 6789  ',
  '99999-8888', '021 99999-8888', '(21) 89999-8888', '(01) 99999-8888', '(21) 6333-4444', '21-999999-99999', '', 'abc',
];

test('o frontend e o backend aplicam a mesma regra de telefone', () => {
  for (const input of PHONE_INPUTS) {
    assert.equal(standardizeBrazilianPhone(input), backendStandardizeBrazilianPhone(input), `formato divergente para "${input}"`);
    assert.equal(normalizeBrazilianPhone(input), backendNormalizeBrazilianPhone(input), `dígitos divergentes para "${input}"`);
  }
});

test('padroniza celular e fixo com DDD', () => {
  assert.equal(standardizeBrazilianPhone('21999998888'), '(21) 99999-8888');
  assert.equal(standardizeBrazilianPhone('+55 11 3333-4444'), '(11) 3333-4444');
  assert.equal(standardizeBrazilianPhone('99999-8888'), null);
});
