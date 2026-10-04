import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBrazilianTaxId, standardizeBrazilianTaxId } from '../src/utils/tax-id.js';
import {
  normalizeBrazilianTaxId as backendNormalizeBrazilianTaxId,
  standardizeBrazilianTaxId as backendStandardizeBrazilianTaxId,
} from '../../backend/src/utils/tax-id.js';

const TAX_ID_INPUTS = [
  '12345678901', '123.456.789-01', '12345678000190', '12.345.678/0001-90', '  12 345 678 0001 90  ', '', '1234', 'CPF 12345678901',
];

test('o frontend e o backend aplicam a mesma regra de CPF e CNPJ', () => {
  for (const input of TAX_ID_INPUTS) {
    assert.equal(standardizeBrazilianTaxId(input), backendStandardizeBrazilianTaxId(input), `formato divergente para "${input}"`);
    assert.equal(normalizeBrazilianTaxId(input), backendNormalizeBrazilianTaxId(input), `dígitos divergentes para "${input}"`);
  }
});

test('padroniza CPF e CNPJ informados somente com números', () => {
  assert.equal(standardizeBrazilianTaxId('12345678901'), '123.456.789-01');
  assert.equal(standardizeBrazilianTaxId('12345678000190'), '12.345.678/0001-90');
  assert.equal(standardizeBrazilianTaxId('1234'), null);
});
