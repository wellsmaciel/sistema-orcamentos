import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeInvalidField } from '../src/utils/form-validation-messages.js';

function field(validity, extra = {}) {
  return { tagName: 'INPUT', type: 'text', title: '', validity: { ...validity }, ...extra };
}

test('campo obrigatório vazio', () => {
  assert.equal(describeInvalidField(field({ valueMissing: true })), 'Preencha este campo.');
  assert.equal(describeInvalidField(field({ valueMissing: true }, { tagName: 'SELECT' })), 'Escolha uma opção.');
});

test('e-mail inválido', () => {
  assert.equal(describeInvalidField(field({ typeMismatch: true }, { type: 'email' })), 'Informe um e-mail válido, por exemplo nome@exemplo.com.');
});

test('formato pedido usa a explicação do próprio campo', () => {
  const quantity = field({ patternMismatch: true }, { title: 'Informe uma quantidade maior que zero.' });

  assert.equal(describeInvalidField(quantity), 'Informe uma quantidade maior que zero.');
  assert.equal(describeInvalidField(field({ patternMismatch: true })), 'Use o formato pedido.');
});

test('datas fora do limite ou incompletas', () => {
  assert.equal(describeInvalidField(field({ rangeUnderflow: true }, { type: 'date' })), 'Escolha uma data a partir do mínimo permitido.');
  assert.equal(describeInvalidField(field({ badInput: true }, { type: 'date' })), 'Informe uma data completa.');
});

test('campo válido não recebe mensagem', () => {
  assert.equal(describeInvalidField(field({})), '');
});
