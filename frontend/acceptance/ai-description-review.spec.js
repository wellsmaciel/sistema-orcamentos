import { expect, test } from '@playwright/test';

const originalDescription = 'instalar 4 camera no predio e configurar gravador';
const suggestion = 'Instalação de quatro câmeras no prédio e configuração do gravador digital.';

async function fillDescriptionAndItem(page) {
  await page.goto('/acceptance/fixture.html?mode=quote-form');
  await page.getByLabel('Descrição geral do serviço').fill(originalDescription);
  await page.getByLabel('Descrição do item').fill('Câmera');
  await page.getByLabel('Quantidade').fill('4');
}

test('prestador revisa a descrição com IA e salva o texto sugerido', async ({ page }) => {
  let reviewBody;
  let savedBody;
  await page.route('**/api/v1/quotes/description-review', (route) => {
    reviewBody = route.request().postDataJSON();
    return route.fulfill({ json: { suggestion } });
  });
  await page.route('**/api/v1/quotes', (route) => {
    savedBody = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: {
        ...savedBody,
        id: 'quote-new',
        status: 'DRAFT',
        items: savedBody.items.map((item, index) => ({ ...item, id: `item-${index}`, position: index + 1, unitPrice: null, subtotal: null })),
      },
    });
  });

  await fillDescriptionAndItem(page);
  await page.getByRole('button', { name: 'Revisar descrição com IA' }).click();

  const suggestionPanel = page.getByRole('article', { name: 'Sugestão da IA' });
  await expect(suggestionPanel).toContainText(suggestion);
  await expect(page.getByLabel('Descrição geral do serviço')).toHaveValue(originalDescription);
  expect(reviewBody).toEqual({ description: originalDescription, items: [{ description: 'Câmera', quantity: '4' }] });

  await suggestionPanel.getByRole('button', { name: 'Usar sugestão' }).click();
  await expect(page.getByLabel('Descrição geral do serviço')).toHaveValue(suggestion);
  await expect(page.getByText('Sugestão aplicada. Confira o texto e salve o orçamento.')).toBeVisible();

  await page.getByLabel('Cliente', { exact: true }).selectOption('client-1');
  await page.getByLabel('Valor global do orçamento (R$)').fill('900');
  await page.getByLabel('Data do serviço').fill('2099-10-15');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();

  await expect(page.getByRole('heading', { name: 'Rascunho salvo' })).toBeVisible();
  expect(savedBody.description).toBe(suggestion);
});

test('prestador pode descartar a sugestão da IA', async ({ page }) => {
  await page.route('**/api/v1/quotes/description-review', (route) => route.fulfill({ json: { suggestion } }));

  await fillDescriptionAndItem(page);
  await page.getByRole('button', { name: 'Revisar descrição com IA' }).click();
  await page.getByRole('button', { name: 'Descartar' }).click();

  await expect(page.getByRole('article', { name: 'Sugestão da IA' })).toHaveCount(0);
  await expect(page.getByLabel('Descrição geral do serviço')).toHaveValue(originalDescription);
});

test('falha da IA é informada sem alterar a descrição', async ({ page }) => {
  await page.route('**/api/v1/quotes/description-review', (route) => route.fulfill({
    status: 503,
    json: { code: 'AI_UNAVAILABLE', message: 'O serviço de IA está indisponível no momento. Tente novamente em alguns minutos.' },
  }));

  await fillDescriptionAndItem(page);
  await page.getByRole('button', { name: 'Revisar descrição com IA' }).click();

  await expect(page.getByRole('alert')).toHaveText('O serviço de IA está indisponível no momento. Tente novamente em alguns minutos.');
  await expect(page.getByLabel('Descrição geral do serviço')).toHaveValue(originalDescription);
  await expect(page.getByRole('button', { name: 'Revisar descrição com IA' })).toBeEnabled();
});
