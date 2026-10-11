import assert from 'node:assert/strict';
import { test } from 'node:test';
import { restoreNavigation, toHistoryState } from '../src/hooks/useAppNavigation.js';

const entry = {
  view: 'quotes',
  previousView: 'home',
  key: 123,
  reviewQuoteId: 'q1',
  quoteClientId: null,
  listClientId: 'c1',
  focusQuote: { quoteId: 'q1', quoteNumber: 1, highlight: false },
  selectedQuote: { id: 'q1', client: { email: 'maria@example.com' } },
  selectedClient: null,
  createdClient: { name: 'Maria', email: 'maria@example.com' },
};

test('o histórico guarda só a tela, identificadores e a conta', () => {
  const state = toHistoryState(entry, 'auth0|a');

  assert.deepEqual(Object.keys(state).sort(), ['focusQuote', 'key', 'listClientId', 'owner', 'previousView', 'quoteClientId', 'reviewQuoteId', 'view']);
  assert.ok(!JSON.stringify(state).includes('maria@example.com'));
});

test('entrada de outra conta, sem conta ou inválida volta ao Início', () => {
  const state = toHistoryState(entry, 'auth0|a');

  assert.equal(restoreNavigation(state, 'auth0|b').view, 'home');
  assert.equal(restoreNavigation(state, undefined).view, 'home');
  assert.equal(restoreNavigation({ ...state, view: 'admin' }, 'auth0|a').view, 'home');
  assert.equal(restoreNavigation(null, 'auth0|a').view, 'home');
});

test('a mesma conta recupera a tela e o filtro', () => {
  const restored = restoreNavigation(toHistoryState(entry, 'auth0|a'), 'auth0|a');

  assert.equal(restored.view, 'quotes');
  assert.equal(restored.previousView, 'home');
  assert.deepEqual(restored.focusQuote, { quoteId: 'q1', quoteNumber: 1, highlight: false });
  assert.equal(restored.listClientId, 'c1');
});

test('edição sem os dados em memória volta para a lista', () => {
  assert.equal(restoreNavigation({ ...toHistoryState(entry, 'auth0|a'), view: 'edit-quote', key: 999 }, 'auth0|a').view, 'quotes');
  assert.equal(restoreNavigation({ ...toHistoryState(entry, 'auth0|a'), view: 'edit-client', key: 999 }, 'auth0|a').view, 'clients');
});

test('o nome do cliente do filtro fica só na memória, nunca no histórico', () => {
  const state = toHistoryState({ ...entry, listClientName: 'Maria Souza' }, 'auth0|a');

  assert.ok(!JSON.stringify(state).includes('Maria Souza'));
  assert.equal(restoreNavigation({ ...state, key: 999 }, 'auth0|a').listClientName, null);
});
