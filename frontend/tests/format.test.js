import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAmount, formatDate, formatQuoteNumber } from '../src/utils/format.js';

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
