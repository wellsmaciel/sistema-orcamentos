import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBrazilianTaxId, standardizeBrazilianTaxId, taxIdErrorMessage } from '../src/utils/tax-id.js';
import {
  normalizeBrazilianTaxId as backendNormalizeBrazilianTaxId,
  standardizeBrazilianTaxId as backendStandardizeBrazilianTaxId,
  taxIdErrorMessage as backendTaxIdErrorMessage,
} from '../../backend/src/utils/tax-id.js';

const TAX_ID_INPUTS = [
  '12345678909', '123.456.789-09', '12345678000195', '12.345.678/0001-95', '  12 345 678 0001 95  ', '', '1234', 'CPF 12345678909',
  '12345678901', '11111111111', '12345678000190', '00000000000000', '12.ABC.345/01DE-35', '12abc34501de35', '12.ABC.345/01DE-34', 'ABC45678909',
];

test('o frontend e o backend aplicam a mesma regra de CPF e CNPJ', () => {
  for (const input of TAX_ID_INPUTS) {
    assert.equal(standardizeBrazilianTaxId(input), backendStandardizeBrazilianTaxId(input), `formato divergente para "${input}"`);
    assert.equal(normalizeBrazilianTaxId(input), backendNormalizeBrazilianTaxId(input), `dígitos divergentes para "${input}"`);
    assert.equal(taxIdErrorMessage(input), backendTaxIdErrorMessage(input), `mensagem divergente para "${input}"`);
  }
});

test('padroniza CPF e CNPJ informados somente com números', () => {
  assert.equal(standardizeBrazilianTaxId('12345678909'), '123.456.789-09');
  assert.equal(standardizeBrazilianTaxId('12345678000195'), '12.345.678/0001-95');
  assert.equal(standardizeBrazilianTaxId('1234'), null);
});

test('confere os dígitos verificadores de CPF e CNPJ', () => {
  assert.equal(normalizeBrazilianTaxId('529.982.247-25'), '52998224725');
  assert.equal(normalizeBrazilianTaxId('11.222.333/0001-81'), '11222333000181');
  assert.equal(normalizeBrazilianTaxId('123.456.789-01'), null);
  assert.equal(normalizeBrazilianTaxId('111.111.111-11'), null);
  assert.equal(normalizeBrazilianTaxId('12.345.678/0001-90'), null);
});

test('aceita o CNPJ alfanumérico (exemplo da Receita Federal) e o padroniza em maiúsculas', () => {
  assert.equal(standardizeBrazilianTaxId('12abc34501de35'), '12.ABC.345/01DE-35');
  assert.equal(standardizeBrazilianTaxId('12.ABC.345/01DE-34'), null);
});

test('a mensagem diz se o problema é o tamanho ou o documento', () => {
  assert.equal(taxIdErrorMessage('1234'), 'Informe um CPF com 11 números ou um CNPJ com 14 caracteres.');
  assert.equal(taxIdErrorMessage('123.456.789-01'), 'CPF inválido: confira os números.');
  assert.equal(taxIdErrorMessage('12.ABC.345/01DE-34'), 'CNPJ inválido: confira os números e as letras.');
});
