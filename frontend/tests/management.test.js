import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAcceptanceRate, formatDaysWaiting, formatResponseTime } from '../src/utils/management.js';

test('formata a taxa de aceite', () => {
  assert.equal(formatAcceptanceRate(0.6667), '67%');
  assert.equal(formatAcceptanceRate(1), '100%');
  assert.equal(formatAcceptanceRate(null), 'Sem respostas');
});

test('mostra o tempo de resposta em horas até 48 horas e depois em dias', () => {
  assert.equal(formatResponseTime(1), '1 hora');
  assert.equal(formatResponseTime(12.5), '12,5 horas');
  assert.equal(formatResponseTime(72), '3 dias');
  assert.equal(formatResponseTime(null), 'Sem respostas');
});

test('descreve há quanto tempo o orçamento aguarda resposta', () => {
  assert.equal(formatDaysWaiting(0), 'enviado hoje');
  assert.equal(formatDaysWaiting(1), 'há 1 dia');
  assert.equal(formatDaysWaiting(12), 'há 12 dias');
});
