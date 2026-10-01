import { expect, test } from '@playwright/test';

for (const pricingMode of ['ITEMIZED', 'FIXED_TOTAL']) {
  test(`criação de orçamento com itens e ${pricingMode}`, async ({ page }) => {
    let submittedBody;
    await page.route('**/api/v1/quotes', (route) => {
      submittedBody = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: {
          ...submittedBody,
          id: 'quote-new',
          status: 'DRAFT',
          totalAmount: pricingMode === 'ITEMIZED' ? '125.00' : submittedBody.totalAmount,
          items: submittedBody.items.map((item, index) => ({
            ...item, id: `item-${index}`, position: index + 1,
            subtotal: pricingMode === 'ITEMIZED' ? '125.00' : null,
          })),
        },
      });
    });

    await page.goto('/acceptance/fixture.html?mode=quote-form');
    await page.getByLabel('Cliente', { exact: true }).selectOption('client-1');
    await page.getByLabel('Forma de cobrança').selectOption(pricingMode);
    await page.getByLabel('Descrição geral do serviço').fill('Instalação de câmera');
    await page.getByLabel('Descrição do item').fill('Câmera');
    await page.getByLabel('Quantidade').fill('2,5');
    if (pricingMode === 'ITEMIZED') {
      await page.getByLabel('Preço unitário (R$)').fill('50');
      await expect(page.getByText('Total calculado (prévia):')).toBeVisible();
      await expect(page.getByText('R$ 125,00').first()).toBeVisible();
    } else {
      await page.getByLabel('Valor global do orçamento (R$)').fill('750');
      await expect(page.getByLabel('Preço unitário (R$)')).toHaveCount(0);
    }
    await page.getByLabel('Data do serviço').fill('2099-10-15');
    await page.getByRole('button', { name: 'Salvar rascunho' }).click();

    await expect(page.getByText('Orçamento criado com sucesso.')).toBeVisible();
    expect(submittedBody.clientId).toBe('client-1');
    expect(submittedBody.pricingMode).toBe(pricingMode);
    expect(submittedBody.items).toEqual([{
      description: 'Câmera', quantity: '2.5',
      ...(pricingMode === 'ITEMIZED' ? { unitPrice: '50' } : {}),
    }]);
    if (pricingMode === 'ITEMIZED') {
      expect(submittedBody).not.toHaveProperty('totalAmount');
    } else {
      expect(submittedBody.totalAmount).toBe('750');
    }
  });
}

test('dados profissionais podem ser atualizados', async ({ page }) => {
  let submittedBody;
  await page.route('**/api/v1/company', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { name: 'Empresa Original', email: 'empresa@example.com', phone: '1133334444' } });
    }
    submittedBody = route.request().postDataJSON();
    return route.fulfill({ json: submittedBody });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await page.getByLabel('Nome profissional ou da empresa').fill('Empresa Atualizada');
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();

  await expect(page.getByText('Dados profissionais salvos com sucesso.')).toBeVisible();
  expect(submittedBody.name).toBe('Empresa Atualizada');
  expect(submittedBody.email).toBe('empresa@example.com');
});

test('cliente pode ser editado', async ({ page }) => {
  let submittedBody;
  await page.route('**/api/v1/clients/client-1', (route) => {
    submittedBody = route.request().postDataJSON();
    return route.fulfill({ json: { ...submittedBody, id: 'client-1' } });
  });

  await page.goto('/acceptance/fixture.html?mode=client-edit');
  await page.getByLabel('Nome', { exact: true }).fill('Cliente Atualizado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByText('Cliente Cliente Atualizado atualizado com sucesso.')).toBeVisible();
  expect(submittedBody.name).toBe('Cliente Atualizado');
  expect(submittedBody.address.city).toBe('São Paulo');
});

test('linha extra em branco é ignorada ao salvar o orçamento', async ({ page }) => {
  let submittedBody;
  await page.route('**/api/v1/quotes', (route) => {
    submittedBody = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: {
        ...submittedBody, id: 'quote-new', status: 'DRAFT',
        items: submittedBody.items.map((item, index) => ({ ...item, id: `item-${index}`, position: index + 1, unitPrice: null, subtotal: null })),
      },
    });
  });

  await page.goto('/acceptance/fixture.html?mode=quote-form');
  await page.getByLabel('Cliente', { exact: true }).selectOption('client-1');
  await page.getByLabel('Descrição geral do serviço').fill('Troca de escapamento');
  await page.getByLabel('Descrição do item').fill('Escapamento');
  await page.getByRole('button', { name: '+ Adicionar outro item' }).click();
  await expect(page.getByLabel('Descrição do item')).toHaveCount(2);
  await page.getByLabel('Valor global do orçamento (R$)').fill('750');
  await page.getByLabel('Data do serviço').fill('2099-10-15');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();

  await expect(page.getByText('Orçamento criado com sucesso.')).toBeVisible();
  expect(submittedBody.items).toEqual([{ description: 'Escapamento', quantity: '1' }]);
});

test('telefone do cliente é padronizado e validado antes de salvar', async ({ page }) => {
  let submittedBody;
  await page.route('**/api/v1/clients/client-1', (route) => {
    submittedBody = route.request().postDataJSON();
    return route.fulfill({ json: { ...submittedBody, id: 'client-1' } });
  });

  await page.goto('/acceptance/fixture.html?mode=client-edit');
  const phone = page.getByLabel('Telefone', { exact: true });

  await phone.fill('9999-8888');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('alert')).toHaveText('Informe o telefone com DDD, por exemplo (21) 99999-8888.');
  expect(submittedBody).toBeUndefined();

  await phone.fill('+55 21 999998888');
  await phone.blur();
  await expect(phone).toHaveValue('(21) 99999-8888');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByText('Cliente Cliente Exemplo atualizado com sucesso.')).toBeVisible();
  expect(submittedBody.phone).toBe('(21) 99999-8888');
});

test('telefone comercial sem DDD não é enviado', async ({ page }) => {
  let saveRequests = 0;
  await page.route('**/api/v1/company', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { name: 'Empresa Original', email: 'empresa@example.com', phone: '1133334444' } });
    }
    saveRequests += 1;
    return route.fulfill({ json: route.request().postDataJSON() });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await page.getByLabel('Telefone comercial').fill('3333-4444');
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();

  await expect(page.getByRole('alert')).toHaveText('Informe o telefone com DDD, por exemplo (21) 99999-8888.');
  expect(saveRequests).toBe(0);
});
