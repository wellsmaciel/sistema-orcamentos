import { expect, test } from '@playwright/test';

test('sem perfil profissional, o aviso aparece e leva ao perfil', async ({ page }) => {
  await page.route('**/api/v1/company', (route) => route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } }));

  await page.goto('/acceptance/fixture.html?mode=profile-reminder');

  await expect(page.getByRole('heading', { name: 'Preencha seu perfil profissional' })).toBeVisible();
  await page.getByRole('button', { name: 'Preencher perfil' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-opened-profile', 'true');
});

test('com o perfil salvo, o aviso não aparece', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/v1/company', (route) => {
    requests += 1;
    return route.fulfill({ json: { id: 'c', name: 'Oficina', email: 'o@example.com', phone: '(11) 3333-4444', hasLogo: false } });
  });

  await page.goto('/acceptance/fixture.html?mode=profile-reminder');

  await expect.poll(() => requests).toBe(1);
  await expect(page.getByRole('heading', { name: 'Preencha seu perfil profissional' })).toHaveCount(0);
});

test('na revisão do orçamento, falta de perfil oferece o atalho para preenchê-lo', async ({ page }) => {
  const draft = {
    id: 'quote-1',
    quoteNumber: 1,
    status: 'DRAFT',
    clientName: 'Maria',
    client: { id: 'client-1', name: 'Maria', email: 'maria@example.com', phone: '(11) 99999-8888' },
    description: 'Instalação',
    pricingMode: 'FIXED_TOTAL',
    totalAmount: '100.00',
    serviceDate: '2099-10-15',
    items: [{ id: 'i1', position: 1, description: 'Câmera', quantity: '1', unitPrice: null, subtotal: null }],
    serviceAddress: { street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
  };
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({ json: { items: [draft], total: 1, page: 1, pageSize: 20, totalPages: 1 } }));
  await page.route('**/api/v1/company', (route) => route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } }));

  await page.goto('/acceptance/fixture.html?review=quote-1');

  await expect(page.getByText('Cadastre seus dados profissionais antes de confirmar o orçamento.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar e gerar link' })).toBeDisabled();
  await page.getByRole('button', { name: 'Preencher perfil' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-opened-profile', 'true');
});
