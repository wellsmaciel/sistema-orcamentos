import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeResponseNotification } from '../src/utils/response-notification.js';

test('descreve a recusa com o motivo', () => {
  assert.equal(
    describeResponseNotification(
      { clientName: 'Maria', decision: 'REJECTED', quoteNumber: 42, respondedAt: '2026-09-30T14:05:00.000Z', rejectionReason: 'Valor acima do esperado' },
      { timeZone: 'UTC' },
    ),
    'Maria recusou o orçamento nº 000042 em 30/09/2026, 14:05. Motivo: Valor acima do esperado',
  );
});

test('descreve o aceite sem motivo', () => {
  assert.equal(
    describeResponseNotification({ clientName: 'João', decision: 'ACCEPTED', quoteNumber: 7, respondedAt: '2026-09-30T09:00:00.000Z', rejectionReason: null }, { timeZone: 'UTC' }),
    'João aceitou o orçamento nº 000007 em 30/09/2026, 09:00.',
  );
});
