import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

// Uma imagem PNG de verdade (o logo do app), para o navegador conseguir abrir e reduzir.
const pngImage = await readFile(new URL('../public/logo-auth0.png', import.meta.url));
const company = { id: 'company-1', name: 'Oficina Exemplo', email: 'oficina@example.com', phone: '(11) 3333-4444' };

function routeCompany(page, body) {
  return page.route('**/api/v1/company', (route) => route.fulfill(body ? { json: body } : { status: 404, json: { code: 'COMPANY_NOT_FOUND' } }));
}

test('prestador escolhe o logo, vê a prévia e salva uma imagem reduzida', async ({ page }) => {
  let uploaded;
  await routeCompany(page, { ...company, hasLogo: false });
  await page.route('**/api/v1/company/logo', (route) => {
    uploaded = { method: route.request().method(), type: route.request().headers()['content-type'], size: route.request().postDataBuffer().length };
    return route.fulfill({ status: 204 });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await page.getByLabel('Escolher imagem').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: pngImage });

  await expect(page.getByRole('img', { name: 'Prévia do novo logo' })).toBeVisible();
  await expect(page.getByText('Prévia: o logo ainda não foi salvo.')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar logo' }).click();

  await expect(page.getByText('Logo salvo. Ele já aparece nos links dos seus orçamentos.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Logo atual da empresa' })).toBeVisible();
  await expect(page.getByLabel('Trocar logo')).toBeAttached();
  expect(uploaded.method).toBe('PUT');
  expect(['image/webp', 'image/png']).toContain(uploaded.type);
  expect(uploaded.size).toBeGreaterThan(0);
  expect(uploaded.size).toBeLessThanOrEqual(200 * 1024);
});

test('prestador pode cancelar a prévia sem enviar o logo', async ({ page }) => {
  let requests = 0;
  await routeCompany(page, { ...company, hasLogo: false });
  await page.route('**/api/v1/company/logo', (route) => {
    requests += 1;
    return route.fulfill({ status: 204 });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await page.getByLabel('Escolher imagem').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: pngImage });
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.getByRole('img', { name: 'Prévia do novo logo' })).toHaveCount(0);
  expect(requests).toBe(0);
});

test('prestador vê o logo atual e pode removê-lo', async ({ page }) => {
  let deleted = false;
  await routeCompany(page, { ...company, hasLogo: true });
  await page.route('**/api/v1/company/logo', (route) => {
    if (route.request().method() === 'DELETE') {
      deleted = true;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ contentType: 'image/png', body: pngImage });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await expect(page.getByRole('img', { name: 'Logo atual da empresa' })).toBeVisible();
  await page.getByRole('button', { name: 'Remover logo' }).click();

  await expect(page.getByText('Logo removido.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Logo atual da empresa' })).toHaveCount(0);
  await expect(page.getByLabel('Escolher imagem')).toBeAttached();
  expect(deleted).toBe(true);
});

test('SVG é recusado antes de qualquer envio', async ({ page }) => {
  let requests = 0;
  await routeCompany(page, { ...company, hasLogo: false });
  await page.route('**/api/v1/company/logo', (route) => {
    requests += 1;
    return route.fulfill({ status: 204 });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await page.getByLabel('Escolher imagem').setInputFiles({
    name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
  });

  await expect(page.getByRole('alert')).toHaveText('Escolha uma imagem PNG, JPEG ou WebP.');
  expect(requests).toBe(0);
});

test('o logo só pode ser enviado depois de salvar os dados profissionais', async ({ page }) => {
  await routeCompany(page, null);

  await page.goto('/acceptance/fixture.html?mode=company');

  await expect(page.getByText('Salve os dados profissionais acima para poder enviar o logo.')).toBeVisible();
  await expect(page.getByLabel('Escolher imagem')).toHaveCount(0);
});

function buildPublicQuote(hasProviderLogo) {
  return {
    quoteNumber: 42, status: 'SENT', clientName: 'Cliente Exemplo', description: 'Instalação de câmeras', pricingMode: 'FIXED_TOTAL',
    items: [{ id: 'item-1', position: 1, description: 'Câmera', quantity: '2', unitPrice: null, subtotal: null }],
    totalAmount: '180.00', serviceDate: '2099-10-15', sentAt: '2026-10-01T12:00:00.000Z', hasProviderLogo,
    serviceAddress: { street: 'Rua Principal', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
    provider: { name: 'Oficina Exemplo', email: 'oficina@example.com', phone: '(11) 3333-4444' },
  };
}

test('cliente vê o logo da empresa no topo e o crédito discreto do app', async ({ page }) => {
  await page.route('**/api/v1/public/quotes/test-public-token', (route) => route.fulfill({ json: buildPublicQuote(true) }));
  await page.route('**/api/v1/public/quotes/test-public-token/logo', (route) => route.fulfill({ contentType: 'image/png', body: pngImage }));

  await page.goto('/acceptance/fixture.html?mode=public');

  const logo = page.getByRole('img', { name: 'Logo de Oficina Exemplo' });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveJSProperty('complete', true);
  expect(await logo.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText('Orçamento gerado com Sistema de Orçamentos')).toBeVisible();
});

test('sem logo, o orçamento público mostra só os dados do prestador', async ({ page }) => {
  let logoRequests = 0;
  await page.route('**/api/v1/public/quotes/test-public-token', (route) => route.fulfill({ json: buildPublicQuote(false) }));
  await page.route('**/api/v1/public/quotes/test-public-token/logo', (route) => {
    logoRequests += 1;
    return route.fulfill({ status: 404, json: { code: 'LOGO_NOT_FOUND' } });
  });

  await page.goto('/acceptance/fixture.html?mode=public');

  await expect(page.getByRole('heading', { name: 'Orçamento nº 000042' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Logo de/ })).toHaveCount(0);
  await expect(page.getByText('Orçamento gerado com Sistema de Orçamentos')).toBeVisible();
  expect(logoRequests).toBe(0);
});
