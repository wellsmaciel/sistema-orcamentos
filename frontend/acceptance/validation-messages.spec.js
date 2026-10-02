import { expect, test } from '@playwright/test';

test('perfil mostra o motivo quando o CPF ou CNPJ é recusado', async ({ page }) => {
  await page.route('**/api/v1/company', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } });
    }
    return route.fulfill({
      status: 400,
      json: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados informados são inválidos.',
        details: [{ field: 'taxId', message: 'Informe um CPF ou CNPJ com 11 ou 14 dígitos.' }],
      },
    });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await expect(page.getByText('CPF com 11 dígitos ou CNPJ com 14')).toBeVisible();

  await page.getByLabel('Nome profissional ou da empresa').fill('Wells Monitoramento e Segurança');
  await page.getByLabel('E-mail comercial').fill('empresa@example.com');
  await page.getByLabel('Telefone comercial').fill('(11) 99999-8888');
  await page.getByLabel('CPF ou CNPJ').fill('11112222333-0001-00');
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();

  await expect(page.getByRole('alert')).toHaveText('CPF ou CNPJ: Informe um CPF ou CNPJ com 11 ou 14 dígitos.');
});

test('os avisos do navegador aparecem em português', async ({ page }) => {
  await page.route('**/api/v1/company', (route) => route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } }));

  await page.goto('/acceptance/fixture.html?mode=company');
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();

  const name = page.getByLabel('Nome profissional ou da empresa');
  await expect(name).toHaveJSProperty('validationMessage', 'Preencha este campo.');

  await name.fill('Oficina Exemplo');
  await page.getByLabel('E-mail comercial').fill('sem-arroba');
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();
  await expect(name).toHaveJSProperty('validationMessage', '');
  await expect(page.getByLabel('E-mail comercial')).toHaveJSProperty('validationMessage', 'Informe um e-mail válido, por exemplo nome@exemplo.com.');
});

test('no valor global, a descrição geral pode virar o item', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');

  const useDescription = page.getByRole('button', { name: 'Usar a descrição geral como item' });
  await expect(useDescription).toHaveCount(0);

  await page.getByLabel('Descrição geral do serviço').fill('Amortecedor, mola e batente das 4 rodas.');
  await useDescription.click();

  await expect(page.getByLabel('Descrição do item')).toHaveValue('Amortecedor, mola e batente das 4 rodas.');
  await expect(page.getByLabel('Quantidade')).toHaveValue('1');
  await expect(useDescription).toHaveCount(0);

  // Com preço por item, cada item tem o próprio preço, então o atalho não aparece.
  await page.getByLabel('Descrição do item').fill('');
  await page.getByLabel('Forma de cobrança').selectOption('ITEMIZED');
  await expect(useDescription).toHaveCount(0);
});
