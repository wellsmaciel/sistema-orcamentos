import { expect, test } from '@playwright/test';

const CLIENT_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

function buildQuote(id, quoteNumber, clientName) {
  return {
    id,
    quoteNumber,
    status: 'SENT',
    publicToken: `token-${id}`,
    clientName,
    client: { id: CLIENT_ID, name: clientName, email: 'rafael@example.com', phone: '(11) 99999-8888' },
    description: 'Instalação',
    pricingMode: 'FIXED_TOTAL',
    totalAmount: '100.00',
    serviceDate: '2099-10-15',
    items: [{ id: `${id}-item`, position: 1, description: 'Câmera', quantity: '1', unitPrice: null, subtotal: null }],
    serviceAddress: { street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
  };
}

function routeQuoteSearch(page, items) {
  const searches = [];
  page.route('**/api/v1/quotes/search?*', (route) => {
    searches.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: { items, total: items.length, page: 1, pageSize: 20, totalPages: items.length > 0 ? 1 : 0 } });
  });
  return searches;
}

test('a lista aberta por um cliente mostra só os orçamentos dele e permite remover o filtro', async ({ page }) => {
  // Os orçamentos guardam o nome da época ("Rafael"); o aviso usa o nome atual, recebido de quem abriu a lista.
  const searches = routeQuoteSearch(page, [buildQuote('q2', 2, 'Rafael'), buildQuote('q1', 1, 'Rafael')]);

  await page.goto(`/acceptance/fixture.html?clientId=${CLIENT_ID}&clientName=${encodeURIComponent('Rafael Varjão')}`);

  const notice = page.locator('.client-filter-notice');
  await expect(notice).toContainText('Mostrando os orçamentos de Rafael Varjão.');
  expect(searches[0].get('clientId')).toBe(CLIENT_ID);

  // Os outros filtros valem junto com o do cliente.
  await page.getByLabel('Situação').selectOption('SENT');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect.poll(() => searches.length).toBe(2);
  expect(searches[1].get('clientId')).toBe(CLIENT_ID);
  expect(searches[1].get('status')).toBe('SENT');

  await notice.getByRole('button', { name: 'Remover filtro do cliente' }).click();
  await expect(notice).toHaveCount(0);
  await expect.poll(() => searches.length).toBe(3);
  expect(searches[2].get('clientId')).toBeNull();
  expect(searches[2].get('status')).toBe('SENT');
});

test('"Limpar filtros" também tira o filtro do cliente', async ({ page }) => {
  const searches = routeQuoteSearch(page, [buildQuote('q1', 1, 'Rafael Varjão')]);

  await page.goto(`/acceptance/fixture.html?clientId=${CLIENT_ID}`);
  await expect(page.locator('.client-filter-notice')).toBeVisible();

  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.client-filter-notice')).toHaveCount(0);
  await expect.poll(() => searches.length).toBe(2);
  expect(searches[1].get('clientId')).toBeNull();
});

test('sem o nome (por exemplo, depois de recarregar), o aviso fica genérico e não usa o nome gravado nos orçamentos', async ({ page }) => {
  routeQuoteSearch(page, [buildQuote('q1', 1, 'Rafael')]);

  await page.goto(`/acceptance/fixture.html?clientId=${CLIENT_ID}`);

  await expect(page.locator('.client-filter-notice')).toContainText('Mostrando os orçamentos do cliente selecionado.');
  await expect(page.locator('.client-filter-notice')).not.toContainText('Rafael');
});

test('cliente sem orçamentos tem uma mensagem própria', async ({ page }) => {
  routeQuoteSearch(page, []);

  await page.goto(`/acceptance/fixture.html?clientId=${CLIENT_ID}`);

  await expect(page.getByText('Este cliente ainda não tem orçamentos.')).toBeVisible();
  await expect(page.locator('.client-filter-notice')).toContainText('Mostrando os orçamentos do cliente selecionado.');
});

test('o cartão do cliente tem o atalho para os orçamentos dele', async ({ page }) => {
  await page.route('**/api/v1/clients/search?*', (route) => route.fulfill({
    json: { items: [{ id: 'client-7', name: 'Rafael Varjão', email: 'rafael@example.com', active: true }], total: 1, page: 1, pageSize: 20, totalPages: 1 },
  }));

  await page.goto('/acceptance/fixture.html?mode=clients-created');
  await page.getByRole('button', { name: 'Ver orçamentos de Rafael Varjão' }).click();

  await expect(page.locator('body')).toHaveAttribute('data-quotes-of-client', 'client-7');
});

test('na gestão, cada principal cliente tem o atalho para os orçamentos dele', async ({ page }) => {
  await page.route('**/api/v1/management/summary?*', (route) => route.fulfill({
    json: {
      period: 'month', periodStart: '2026-10-01T03:00:00.000Z', totalQuotes: 1,
      statusCounts: { DRAFT: 0, SENT: 0, ACCEPTED: 1, REJECTED: 0 },
      acceptanceRate: 1, acceptedAmount: '1500.00', openAmount: '0.00', averageResponseHours: 5,
      awaitingResponse: [],
      topClients: [{ clientId: 'c1', clientName: 'Rafael Varjão', acceptedCount: 1, acceptedAmount: '1500.00' }],
    },
  }));

  await page.goto('/acceptance/fixture.html?mode=management');
  await page.getByRole('button', { name: 'Ver orçamentos de Rafael Varjão' }).click();

  await expect(page.locator('body')).toHaveAttribute('data-quotes-of-client', 'c1:Rafael Varjão');
});

test('no computador, um único orçamento ocupa a largura toda; com dois, cada um fica numa coluna', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const items = [buildQuote('q1', 1, 'Rafael Varjão')];
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({ json: { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 } }));

  await page.goto('/acceptance/fixture.html');
  const gridWidth = (await page.locator('ul.card-grid').boundingBox()).width;
  expect((await page.locator('#quote-q1').boundingBox()).width).toBeGreaterThan(gridWidth * 0.95);

  items.push(buildQuote('q2', 2, 'Rafael Varjão'));
  await page.getByRole('button', { name: 'Atualizar lista' }).click();
  await expect(page.locator('#quote-q2')).toBeVisible();
  expect((await page.locator('#quote-q1').boundingBox()).width).toBeLessThan(gridWidth * 0.6);
});

test('no computador, um único cliente encontrado ocupa a largura toda', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/api/v1/clients/search?*', (route) => route.fulfill({
    json: { items: [{ id: 'client-7', name: 'Rafael Varjão', email: 'rafael@example.com', active: true }], total: 1, page: 1, pageSize: 20, totalPages: 1 },
  }));

  await page.goto('/acceptance/fixture.html?mode=clients-created');
  const card = page.locator('.client-card');
  await expect(card).toBeVisible();
  const gridWidth = (await page.locator('ul.card-grid').boundingBox()).width;
  expect((await card.boundingBox()).width).toBeGreaterThan(gridWidth * 0.95);
});
