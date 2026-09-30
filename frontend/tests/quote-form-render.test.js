import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let viteServer;
let QuoteForm;

before(async () => {
  viteServer = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ default: QuoteForm } = await viteServer.ssrLoadModule('/src/components/QuoteForm.jsx'));
});

after(async () => {
  await viteServer?.close();
});

function buildQuote(pricingMode = 'FIXED_TOTAL') {
  return {
    id: 'quote-id',
    status: 'DRAFT',
    client: { id: 'client-id', name: 'Cliente de teste', email: 'cliente@example.com', phone: '11999999999' },
    description: 'Descrição geral do serviço.',
    pricingMode,
    items: [{ id: 'item-id', description: 'Cabo elétrico', quantity: '2.500', unitPrice: pricingMode === 'ITEMIZED' ? '19.99' : null }],
    totalAmount: pricingMode === 'ITEMIZED' ? '49.98' : '1000.00',
    serviceDate: '2099-10-15',
    serviceAddress: { street: 'Rua de Teste', number: '100', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP' },
  };
}

function renderForm(props) {
  return renderToStaticMarkup(createElement(QuoteForm, { getAccessTokenSilently: async () => 'token', ...props }));
}

test('novo orçamento começa no modo global, com uma linha e remoção da última linha desabilitada', () => {
  const markup = renderForm({ clients: [buildQuote().client] });
  assert.match(markup, /value="FIXED_TOTAL" selected=""/);
  assert.match(markup, /<legend>Item 1<\/legend>/);
  assert.match(markup, /name="quantity"[^>]*value="1"/);
  assert.match(markup, /disabled="" aria-label="Remover item 1"/);
  assert.match(markup, /\+ Adicionar outro item/);
  assert.match(markup, /name="totalAmount"/);
  assert.doesNotMatch(markup, /name="unitPrice"/);
});

test('rascunho por item carrega os valores e mostra prévia, sem campo de total manual', () => {
  const markup = renderForm({ quote: buildQuote('ITEMIZED') });
  assert.match(markup, /value="ITEMIZED" selected=""/);
  assert.match(markup, /name="unitPrice"/);
  assert.match(markup, /value="19.99"/);
  assert.match(markup, /value="2,5"/);
  assert.match(markup, /49,98/);
  assert.match(markup, /Total calculado/);
  assert.doesNotMatch(markup, /name="totalAmount"/);
});

test('rascunho global carrega itens e total, mas não exibe preços ou subtotais', () => {
  const markup = renderForm({ quote: buildQuote() });
  assert.match(markup, /value="Cabo elétrico"/);
  assert.match(markup, /value="1000.00"/);
  assert.doesNotMatch(markup, /name="unitPrice"|Subtotal:|Total calculado/);
});

test('rascunho antigo sem itens abre uma linha vazia para preenchimento, sem mudar o original', () => {
  const quote = buildQuote();
  quote.items = [];
  const markup = renderForm({ quote });
  assert.match(markup, /<legend>Item 1<\/legend>/);
  assert.deepEqual(quote.items, []);
});

for (const status of ['SENT', 'ACCEPTED', 'REJECTED']) {
  test(`bloqueia o formulário para orçamento ${status}`, () => {
    const markup = renderForm({ quote: { ...buildQuote(), status } });
    assert.match(markup, /Somente orçamentos em rascunho/);
    assert.doesNotMatch(markup, /<form/);
  });
}

test('duas linhas têm identificadores próprios e podem ser removidas', () => {
  const quote = buildQuote('ITEMIZED');
  quote.items.push({ id: 'second-item', description: 'Mão de obra', quantity: '1', unitPrice: '100.00' });
  const markup = renderForm({ quote });
  const quantityIds = [...markup.matchAll(/id="(quote-item-[^"]+-quantity)"/g)].map((match) => match[1]);
  assert.equal(quantityIds.length, 2);
  assert.equal(new Set(quantityIds).size, 2);
  assert.match(markup, /<legend>Item 2<\/legend>/);
  assert.match(markup, /149,98/);
  assert.doesNotMatch(markup, /disabled="" aria-label="Remover item/);
});

test('exibe inteiro sem casas decimais e indica o limite de uma casa no campo', () => {
  const quote = buildQuote();
  quote.items[0].quantity = '3.000';
  const markup = renderForm({ quote });

  assert.match(markup, /name="quantity"[^>]*value="3"/);
  assert.match(markup, /uma casa decimal/);
  assert.doesNotMatch(markup, /value="3.000"|três casas decimais/);
});

test('preserva quantidade histórica significativa e pede revisão, sem arredondamento automático', () => {
  const quote = buildQuote();
  quote.items[0].quantity = '1.250';
  const markup = renderForm({ quote });

  assert.match(markup, /value="1,25"/);
  assert.match(markup, /nenhum valor foi arredondado automaticamente/);
});
