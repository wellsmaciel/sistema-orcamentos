import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAmount, formatDate, formatQuoteNumber, formatServiceAddressLine } from '../src/utils/format.js';

test('número do orçamento sempre com seis dígitos', () => {
  assert.equal(formatQuoteNumber(42), '000042');
  assert.equal(formatQuoteNumber(2572), '002572');
});

test('valor em reais no formato brasileiro', () => {
  assert.equal(formatAmount('1200.5').replace(/\s/g, ' '), 'R$ 1.200,50');
});

test('data da API no formato brasileiro, sem mudar o dia por causa do fuso', () => {
  assert.equal(formatDate('2026-10-15'), '15/10/2026');
});

test('o endereço do serviço vira uma linha, com o complemento só quando existe', () => {
  const address = { street: 'Rua A', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' };

  assert.equal(formatServiceAddressLine(address), 'Rua A, 10 · Centro, São Paulo – SP · CEP 01001-000');
  assert.equal(formatServiceAddressLine({ ...address, complement: 'fundos' }), 'Rua A, 10, fundos · Centro, São Paulo – SP · CEP 01001-000');
});
