import { expect, test } from '@playwright/test';

const quote = {
  id: 'quote-1', quoteNumber: 42, status: 'DRAFT',
  client: { id: 'client-1', name: 'Cliente Exemplo', email: 'cliente@example.com', phone: '(11) 99999-8888' },
  clientName: 'Cliente Exemplo', description: 'Instalação de câmeras', pricingMode: 'FIXED_TOTAL',
  items: [{ id: 'item-1', position: 1, description: 'Câmera', quantity: '2', unitPrice: null, subtotal: null }],
  totalAmount: '180.00', serviceDate: '2099-10-15',
  serviceAddress: { street: 'Rua Principal', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
};

async function mockQuotes(page) {
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({
    json: { items: [quote, { ...quote, id: 'quote-2', quoteNumber: 43 }], total: 2, page: 1, pageSize: 20, totalPages: 1 },
  }));
}

test.describe('tela grande', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('mostra a navegação com a página atual e organiza os orçamentos em duas colunas', async ({ page }) => {
    await mockQuotes(page);
    await page.goto('/acceptance/fixture.html?mode=layout&view=quotes');

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Orçamentos' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('button', { name: 'Clientes' })).not.toHaveAttribute('aria-current', 'page');

    const cards = page.locator('ul.card-grid > li');
    await expect(cards).toHaveCount(2);
    const [first, second] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
    expect(Math.abs(first.y - second.y)).toBeLessThan(2);
    expect(second.x).toBeGreaterThan(first.x + first.width);

    await nav.getByRole('button', { name: 'Gestão' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-navigated-to', 'management');
    await nav.getByRole('button', { name: 'Sair' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-logged-out', 'true');
  });

  test('no formulário, campos curtos ficam lado a lado e a descrição ocupa a largura toda', async ({ page }) => {
    await page.goto('/acceptance/fixture.html?mode=layout&view=new-quote');

    const client = await page.getByLabel('Cliente', { exact: true }).boundingBox();
    const pricing = await page.getByLabel('Forma de cobrança').boundingBox();
    const description = await page.getByLabel('Descrição geral do serviço').boundingBox();

    expect(Math.abs(client.y - pricing.y)).toBeLessThan(2);
    expect(description.width).toBeGreaterThan(client.width * 1.8);
  });
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test('não mostra a navegação e mantém os orçamentos em uma coluna', async ({ page }) => {
    await mockQuotes(page);
    await page.goto('/acceptance/fixture.html?mode=layout&view=quotes');

    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
    const cards = page.locator('ul.card-grid > li');
    const [first, second] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
    expect(second.y).toBeGreaterThan(first.y + first.height - 1);
  });
});

test('no desktop, a tela inicial não repete o menu da barra; no celular, os blocos continuam', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/acceptance/fixture.html?mode=layout&view=home');
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeHidden();

  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible();
});

test('em 1024 px (tablet deitado), a barra de navegação cabe numa linha', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/acceptance/fixture.html?mode=layout&view=home');

  const buttons = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button');
  await expect(buttons).toHaveCount(8);
  const tops = await buttons.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
});
