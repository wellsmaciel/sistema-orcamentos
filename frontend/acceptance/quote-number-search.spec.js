import { expect, test } from '@playwright/test';

function buildQuote(id, quoteNumber, status = 'REJECTED') {
  return {
    id, quoteNumber, status, clientName: 'Fernanda',
    client: { id: 'client-1', name: 'Fernanda', email: 'fernanda@example.com', phone: '(11) 99999-8888' }, description: 'Instalação de câmeras', pricingMode: 'FIXED_TOTAL',
    items: [{ id: `${id}-item`, position: 1, description: 'Câmera', quantity: '2', unitPrice: null, subtotal: null }],
    totalAmount: '180.00', serviceDate: '2099-10-15', publicToken: 'a'.repeat(64), rejectionReason: 'Data',
    serviceAddress: { street: 'Rua Principal', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
  };
}

test('prestador busca um orçamento pelo número no mesmo campo da busca por cliente', async ({ page }) => {
  const searches = [];
  await page.route('**/api/v1/quotes/search?*', (route) => {
    const search = new URL(route.request().url()).searchParams.get('search') ?? '';
    searches.push(search);
    const items = search ? [buildQuote('quote-1953', 1953)] : [buildQuote('quote-1953', 1953), buildQuote('quote-2000', 2000, 'SENT')];
    return route.fulfill({ json: { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 } });
  });

  await page.goto('/acceptance/fixture.html');
  await expect(page.getByRole('heading', { name: 'Orçamento nº 002000' })).toBeVisible();

  await page.getByLabel('Buscar por cliente ou nº do orçamento').fill('1953');
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page.getByRole('heading', { name: 'Orçamento nº 002000' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Orçamento nº 001953' })).toBeVisible();
  expect(searches.at(-1)).toBe('1953');
});

test('aberto pelo aviso, o orçamento aparece filtrado e destacado', async ({ page }) => {
  const searches = [];
  await page.route('**/api/v1/quotes/search?*', (route) => {
    searches.push(new URL(route.request().url()).searchParams.get('search'));
    return route.fulfill({ json: { items: [buildQuote('quote-1953', 1953)], total: 1, page: 1, pageSize: 20, totalPages: 1 } });
  });

  await page.goto('/acceptance/fixture.html?focusId=quote-1953&focusNumber=1953');

  const card = page.locator('#quote-quote-1953');
  await expect(card).toHaveClass(/quote-card-reviewing/);
  await expect(card.getByText('Aberto pelo aviso')).toBeVisible();
  await expect(page.getByLabel('Buscar por cliente ou nº do orçamento')).toHaveValue('001953');
  expect(searches).toEqual(['001953']);

  // Limpar os filtros volta para a lista completa, sem destaque.
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByText('Aberto pelo aviso')).toHaveCount(0);
  await expect(page.getByLabel('Buscar por cliente ou nº do orçamento')).toHaveValue('');
});

test('cada resposta do quadro abre o próprio orçamento e avisa quando há mais respostas novas', async ({ page }) => {
  await page.route('**/api/v1/notifications/responses', (route) => route.fulfill({
    json: {
      unreadCount: 6,
      items: [
        { quoteId: 'q2', quoteNumber: 1953, clientName: 'Fernanda', decision: 'REJECTED', rejectionReason: 'data', respondedAt: '2026-10-02T15:40:00.000Z', unread: true },
        { quoteId: 'q1', quoteNumber: 2091, clientName: 'Rafael', decision: 'ACCEPTED', rejectionReason: null, respondedAt: '2026-10-02T15:39:00.000Z', unread: true },
      ],
    },
  }));

  await page.goto('/acceptance/fixture.html?mode=notifications');

  const panel = page.getByRole('region', { name: /Respostas dos clientes/ });
  await expect(panel.getByText('E mais 4 respostas novas em "Ver orçamentos".')).toBeVisible();

  await panel.getByRole('button', { name: 'Abrir orçamento nº 001953' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-opened-quote', 'q2:1953');
});

test('a edição mostra o número do orçamento e devolve o rascunho salvo', async ({ page }) => {
  await page.route('**/api/v1/quotes/quote-2089', (route) => route.fulfill({ json: { ...route.request().postDataJSON(), id: 'quote-2089', quoteNumber: 2089, status: 'DRAFT' } }));

  await page.goto('/acceptance/fixture.html?mode=quote-edit');

  await expect(page.getByRole('heading', { level: 2, name: 'Editar orçamento nº 002089' })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-saved-quote', 'quote-2089:2089');
});

test('depois de salvar a edição, a lista abre filtrada com a revisão do rascunho', async ({ page }) => {
  const draft = { ...buildQuote('quote-2089', 2089, 'DRAFT'), publicToken: null, rejectionReason: null };
  const searches = [];
  await page.route('**/api/v1/quotes/search?*', (route) => {
    searches.push(new URL(route.request().url()).searchParams.get('search'));
    return route.fulfill({ json: { items: [draft], total: 1, page: 1, pageSize: 20, totalPages: 1 } });
  });
  await page.route('**/api/v1/company', (route) => route.fulfill({ json: { id: 'c', name: 'Oficina', email: 'o@example.com', phone: '(11) 3333-4444', hasLogo: false } }));

  await page.goto('/acceptance/fixture.html?focusId=quote-2089&focusNumber=2089&focusHighlight=false&review=quote-2089');

  const card = page.locator('#quote-quote-2089');
  await expect(card.getByText('Em revisão')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar e gerar link' })).toBeVisible();
  await expect(page.getByText('Aberto pelo aviso')).toHaveCount(0);
  expect(searches).toEqual(['002089']);
});
