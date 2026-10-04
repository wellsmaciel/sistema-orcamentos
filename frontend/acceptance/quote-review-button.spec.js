import { expect, test } from '@playwright/test';

function buildDraft(id, quoteNumber) {
  return {
    id,
    quoteNumber,
    status: 'DRAFT',
    clientName: 'Maria',
    client: { id: 'client-1', name: 'Maria', email: 'maria@example.com', phone: '(11) 99999-8888' },
    description: 'Instalação',
    pricingMode: 'FIXED_TOTAL',
    totalAmount: '100.00',
    serviceDate: '2099-10-15',
    items: [{ id: `${id}-item`, position: 1, description: 'Câmera', quantity: '1', unitPrice: null, subtotal: null }],
    serviceAddress: { street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
  };
}

test('com a revisão aberta, o cartão não mostra o botão "Revisar orçamento"', async ({ page }) => {
  let releaseCompany;
  const companyAnswered = new Promise((resolve) => { releaseCompany = resolve; });
  const drafts = [buildDraft('quote-1', 1), buildDraft('quote-2', 2)];
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({ json: { items: drafts, total: 2, page: 1, pageSize: 20, totalPages: 1 } }));
  await page.route('**/api/v1/company', async (route) => {
    await companyAnswered;
    return route.fulfill({ json: { id: 'c', name: 'Oficina', email: 'o@example.com', phone: '(11) 3333-4444', hasLogo: false } });
  });

  await page.goto('/acceptance/fixture.html');
  const first = page.locator('#quote-quote-1');
  const second = page.locator('#quote-quote-2');

  await first.getByRole('button', { name: 'Revisar orçamento' }).click();

  // Enquanto carrega, só o cartão clicado mostra "Carregando revisão...".
  await expect(first.getByRole('button', { name: 'Carregando revisão...' })).toBeVisible();
  await expect(second.getByRole('button', { name: 'Revisar orçamento' })).toBeVisible();
  releaseCompany();

  await expect(first.getByText('Em revisão')).toBeVisible();
  await expect(first.getByRole('button', { name: 'Revisar orçamento' })).toHaveCount(0);
  await expect(first.getByRole('button', { name: 'Confirmar e gerar link' })).toBeVisible();
  await expect(second.getByRole('button', { name: 'Revisar orçamento' })).toBeVisible();

  await first.getByRole('button', { name: 'Voltar à lista' }).click();
  await expect(first.getByRole('button', { name: 'Revisar orçamento' })).toBeVisible();
});
