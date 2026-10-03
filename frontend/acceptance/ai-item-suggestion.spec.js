import { expect, test } from '@playwright/test';

const description = 'Placa-mãe 870X, memória DDR5 16 GB (2 unidades), processador 7800X, fonte 800W.';

test('prestador separa a descrição em itens com IA e só depois informa os preços', async ({ page }) => {
  let submittedBody;
  await page.route('**/api/v1/quotes/item-suggestions', (route) => {
    submittedBody = route.request().postDataJSON();
    return route.fulfill({
      json: {
        items: [
          { description: 'Placa-mãe 870X', quantity: '1' },
          { description: 'Memória DDR5 16 GB', quantity: '2' },
          { description: 'Fonte 800W', quantity: '1' },
        ],
      },
    });
  });

  await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');
  await page.getByLabel('Forma de cobrança').selectOption('ITEMIZED');
  await page.getByLabel('Descrição geral do serviço').fill(description);
  await page.getByRole('button', { name: 'Separar a descrição em itens com IA' }).click();

  const suggestion = page.getByRole('article', { name: 'Itens sugeridos pela IA' });
  await expect(suggestion.getByRole('listitem')).toHaveText([
    'Placa-mãe 870X (quantidade: 1)',
    'Memória DDR5 16 GB (quantidade: 2)',
    'Fonte 800W (quantidade: 1)',
  ]);
  expect(submittedBody).toEqual({ description });

  // Até confirmar, nenhum item é preenchido.
  await expect(page.getByLabel('Descrição do item')).toHaveValue('');
  await suggestion.getByRole('button', { name: 'Usar itens' }).click();

  const descriptions = page.getByLabel('Descrição do item');
  await expect(descriptions).toHaveCount(3);
  await expect(descriptions.nth(1)).toHaveValue('Memória DDR5 16 GB');
  await expect(page.getByLabel('Quantidade').nth(1)).toHaveValue('2');
  await expect(page.getByLabel('Preço unitário (R$)').first()).toHaveValue('');
  await expect(page.getByText('Itens aplicados. Informe o preço de cada item e confira as quantidades.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Separar a descrição em itens com IA' })).toHaveCount(0);
});

test('descartar a sugestão mantém os itens vazios', async ({ page }) => {
  await page.route('**/api/v1/quotes/item-suggestions', (route) => route.fulfill({ json: { items: [{ description: 'Fonte 800W', quantity: '1' }] } }));

  await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');
  await page.getByLabel('Descrição geral do serviço').fill(description);
  await page.getByRole('button', { name: 'Separar a descrição em itens com IA' }).click();
  await page.getByRole('article', { name: 'Itens sugeridos pela IA' }).getByRole('button', { name: 'Descartar' }).click();

  await expect(page.getByRole('article', { name: 'Itens sugeridos pela IA' })).toHaveCount(0);
  await expect(page.getByLabel('Descrição do item')).toHaveValue('');
});

test('mostra o motivo quando a IA não pode ajudar', async ({ page }) => {
  await page.route('**/api/v1/quotes/item-suggestions', (route) => route.fulfill({
    status: 429,
    json: { code: 'AI_RATE_LIMITED', message: 'Você atingiu o limite de uso da IA. Tente novamente em alguns minutos.' },
  }));

  await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');
  await page.getByLabel('Descrição geral do serviço').fill(description);
  await page.getByRole('button', { name: 'Separar a descrição em itens com IA' }).click();

  await expect(page.getByRole('alert')).toHaveText('Você atingiu o limite de uso da IA. Tente novamente em alguns minutos.');
});
