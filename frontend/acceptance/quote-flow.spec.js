import { expect, test } from '@playwright/test';

function buildQuote(pricingMode) {
  const itemized = pricingMode === 'ITEMIZED';
  return {
    id: 'quote-1', quoteNumber: 42, status: 'DRAFT',
    client: { id: 'client-1', name: 'Cliente Exemplo', email: 'cliente@example.com', phone: '11999999999' },
    clientName: 'Cliente Exemplo', description: 'Instalação de câmeras', pricingMode,
    items: [{ id: 'item-1', position: 1, description: 'Câmera', quantity: '2', unitPrice: itemized ? '50.00' : null, subtotal: itemized ? '100.00' : null }],
    totalAmount: itemized ? '100.00' : '180.00', serviceDate: '2099-10-15',
    serviceAddress: { street: 'Rua Principal', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
    locationNotes: 'Portaria lateral',
  };
}

for (const pricingMode of ['ITEMIZED', 'FIXED_TOTAL']) {
  test(`prestador revisa todos os dados antes de confirmar ${pricingMode}`, async ({ page }) => {
    const quote = buildQuote(pricingMode);
    let confirmed = false;
    let confirmRequests = 0;

    await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({
      json: { items: [{ ...quote, status: confirmed ? 'SENT' : 'DRAFT', publicToken: confirmed ? 'test-public-token' : undefined }], total: 1, page: 1, pageSize: 20, totalPages: 1 },
    }));
    await page.route('**/api/v1/company', (route) => route.fulfill({
      json: { name: 'Empresa Exemplo', email: 'empresa@example.com', phone: '1133334444' },
    }));
    await page.route('**/api/v1/quotes/quote-1/confirm', (route) => {
      confirmRequests += 1;
      confirmed = true;
      return route.fulfill({ json: { ...quote, status: 'SENT', publicToken: 'test-public-token' } });
    });

    await page.goto('/acceptance/fixture.html');
    await expect(page.getByRole('button', { name: 'Confirmar e gerar link' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Revisar orçamento' }).click();
    const review = page.getByRole('region', { name: 'Confira todos os dados antes de confirmar' });
    await expect(review).toContainText('cliente@example.com');
    await expect(review).toContainText('Empresa Exemplo');
    await expect(review).toContainText('Rua Principal');
    await expect(review).toContainText('Portaria lateral');
    await expect(review).toContainText('Câmera');
    await expect(review).toContainText(pricingMode === 'ITEMIZED' ? 'Preço por item' : 'Valor global');
    if (pricingMode === 'ITEMIZED') {
      await expect(review).toContainText('Subtotal: R$ 100,00');
    } else {
      await expect(review).not.toContainText('Valor unitário');
      await expect(review).toContainText('R$ 180,00');
    }
    expect(confirmRequests).toBe(0);
    await page.getByRole('button', { name: 'Confirmar e gerar link' }).click();
    await expect(page.getByRole('link', { name: 'Abrir orçamento público' })).toBeVisible();
    expect(confirmRequests).toBe(1);
  });

  test(`cliente vê os itens de ${pricingMode} no link público`, async ({ page }) => {
    const quote = { ...buildQuote(pricingMode), status: 'SENT' };
    await page.route('**/api/v1/public/quotes/test-public-token', (route) => route.fulfill({ json: quote }));
    await page.goto('/acceptance/fixture.html?mode=public');
    await expect(page.getByRole('heading', { name: 'Itens do orçamento' })).toBeVisible();
    await expect(page.getByText('Câmera', { exact: true })).toBeVisible();
    await expect(page.getByText('Quantidade: 2')).toBeVisible();
    await expect(page.getByText(pricingMode === 'ITEMIZED' ? 'Valor total: R$ 100,00' : 'Valor total: R$ 180,00')).toBeVisible();
    if (pricingMode === 'FIXED_TOTAL') {
      await expect(page.getByText(/Valor unitário:/)).toHaveCount(0);
    }
  });
}

for (const decision of ['ACCEPTED', 'REJECTED']) {
  test(`cliente pode responder ${decision} pelo link público`, async ({ page }) => {
    const quote = { ...buildQuote('FIXED_TOTAL'), status: 'SENT' };
    let submittedBody;
    await page.route('**/api/v1/public/quotes/test-public-token', (route) => route.fulfill({ json: quote }));
    await page.route('**/api/v1/public/quotes/test-public-token/respond', (route) => {
      submittedBody = route.request().postDataJSON();
      return route.fulfill({ json: { ...quote, status: decision, rejectionReason: submittedBody.reason } });
    });

    await page.goto('/acceptance/fixture.html?mode=public');
    await page.getByRole('button', { name: decision === 'ACCEPTED' ? 'Aceitar orçamento' : 'Recusar orçamento' }).click();
    if (decision === 'REJECTED') {
      await page.getByLabel('Motivo da recusa (opcional)').fill('Preciso rever o prazo.');
    }
    await page.getByRole('button', { name: decision === 'ACCEPTED' ? 'Confirmar aceitação' : 'Confirmar recusa' }).click();
    await expect(page.getByText(decision === 'ACCEPTED' ? 'Orçamento aceito com sucesso.' : 'Recusa registrada com sucesso.')).toBeVisible();
    expect(submittedBody.decision).toBe(decision);
    if (decision === 'REJECTED') {
      expect(submittedBody.reason).toBe('Preciso rever o prazo.');
    }
  });
}

test('sem perfil profissional, a revisão impede a confirmação', async ({ page }) => {
  const quote = buildQuote('FIXED_TOTAL');
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({ json: { items: [quote], total: 1, page: 1, pageSize: 20, totalPages: 1 } }));
  await page.route('**/api/v1/company', (route) => route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } }));
  await page.goto('/acceptance/fixture.html');
  await page.getByRole('button', { name: 'Revisar orçamento' }).click();
  await expect(page.getByText('Cadastre seus dados profissionais antes de confirmar o orçamento.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar e gerar link' })).toBeDisabled();
});

test('lista de orçamentos permite tentar novamente após falha de rede', async ({ page }) => {
  const quote = buildQuote('FIXED_TOTAL');
  let attempts = 0;

  await page.route('**/api/v1/quotes/search?*', (route) => {
    attempts += 1;
    if (attempts === 1) return route.abort('failed');
    return route.fulfill({ json: { items: [quote], total: 1, page: 1, pageSize: 20, totalPages: 1 } });
  });

  await page.goto('/acceptance/fixture.html');
  await expect(page.getByRole('alert')).toContainText('Não foi possível se comunicar com o sistema');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Orçamento nº 000042')).toBeVisible();
  expect(attempts).toBe(2);
});

test('orçamento público permite tentar novamente após falha de rede', async ({ page }) => {
  const quote = { ...buildQuote('FIXED_TOTAL'), status: 'SENT' };
  let attempts = 0;

  await page.route('**/api/v1/public/quotes/test-public-token', (route) => {
    attempts += 1;
    if (attempts === 1) return route.abort('failed');
    return route.fulfill({ json: quote });
  });

  await page.goto('/acceptance/fixture.html?mode=public');
  await expect(page.getByRole('alert')).toContainText('Não foi possível se comunicar com o sistema');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Itens do orçamento' })).toBeVisible();
  expect(attempts).toBe(2);
});

test('tamanho do texto e alto contraste persistem na página pública', async ({ page }) => {
  const quote = { ...buildQuote('FIXED_TOTAL'), status: 'SENT' };
  await page.route('**/api/v1/public/quotes/test-public-token', (route) => route.fulfill({ json: quote }));
  await page.goto('/acceptance/fixture.html?mode=public');
  await page.getByRole('button', { name: 'Aumentar texto' }).click();
  await page.getByRole('button', { name: 'Aumentar texto' }).click();
  await page.getByRole('button', { name: 'Alto contraste' }).click();
  await expect(page.getByRole('button', { name: 'Alto contraste' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', '150');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', '150');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
});

test('prestador consulta alterações e resposta no histórico do orçamento', async ({ page }) => {
  const quote = buildQuote('ITEMIZED');
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({
    json: { items: [quote], total: 1, page: 1, pageSize: 20, totalPages: 1 },
  }));
  await page.route('**/api/v1/quotes/quote-1/history', (route) => route.fulfill({
    json: { items: [
      {
        id: 'event-1', type: 'UPDATED', actor: 'PROVIDER', createdAt: '2026-09-30T12:00:00.000Z',
        details: { changes: [{ field: 'serviceDate', before: '2099-10-15', after: '2099-10-20' }] },
      },
      {
        id: 'event-2', type: 'REJECTED', actor: 'CLIENT', createdAt: '2026-09-30T13:00:00.000Z',
        details: { rejectionReason: 'Preciso rever o prazo.' },
      },
    ] },
  }));

  await page.goto('/acceptance/fixture.html');
  await page.getByRole('button', { name: 'Ver histórico' }).click();

  const history = page.getByRole('region', { name: 'Histórico do orçamento' });
  await expect(history).toContainText('Rascunho alterado');
  await expect(history).toContainText('15/10/2099');
  await expect(history).toContainText('20/10/2099');
  await expect(history).toContainText('Cliente recusou o orçamento');
  await expect(history).toContainText('Preciso rever o prazo.');
});

test('orçamento anterior ao histórico informa que não há eventos recuperáveis', async ({ page }) => {
  const quote = buildQuote('FIXED_TOTAL');
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({
    json: { items: [quote], total: 1, page: 1, pageSize: 20, totalPages: 1 },
  }));
  await page.route('**/api/v1/quotes/quote-1/history', (route) => route.fulfill({ json: { items: [] } }));

  await page.goto('/acceptance/fixture.html');
  await page.getByRole('button', { name: 'Ver histórico' }).click();
  await expect(page.getByRole('region', { name: 'Histórico do orçamento' })).toContainText(
    'Ainda não há registros no histórico deste orçamento.',
  );
});
