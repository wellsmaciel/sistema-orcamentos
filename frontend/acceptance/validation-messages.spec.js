import { expect, test } from '@playwright/test';

async function fillCompanyProfile(page, taxId) {
  await page.getByLabel('Nome profissional ou da empresa').fill('Wells Monitoramento e Segurança');
  await page.getByLabel('E-mail comercial').fill('empresa@example.com');
  await page.getByLabel('Telefone comercial').fill('(11) 99999-8888');
  await page.getByLabel('CPF ou CNPJ').fill(taxId);
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();
}

test('perfil recusa CPF ou CNPJ inválido antes de enviar, junto ao campo', async ({ page }) => {
  let saveRequests = 0;
  await page.route('**/api/v1/company', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } });
    }
    saveRequests += 1;
    return route.fulfill({ status: 204 });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await expect(page.getByText('CPF com 11 dígitos ou CNPJ com 14')).toBeVisible();
  await fillCompanyProfile(page, '11112222333-0001-00');

  const taxId = page.getByLabel('CPF ou CNPJ');
  await expect(page.getByRole('alert')).toHaveText('Informe um CPF ou CNPJ com 11 ou 14 dígitos.');
  await expect(taxId).toHaveAttribute('aria-invalid', 'true');
  await expect(taxId).toHaveCSS('border-color', 'rgb(185, 28, 28)');
  await expect(taxId).toBeFocused();
  expect(saveRequests).toBe(0);
});

test('perfil mostra o motivo quando o servidor recusa um campo', async ({ page }) => {
  await page.route('**/api/v1/company', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } });
    }
    return route.fulfill({
      status: 400,
      json: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados informados são inválidos.',
        details: [{ field: 'address.postalCode', message: 'Este campo é obrigatório.' }],
      },
    });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await fillCompanyProfile(page, '12345678000190');

  // A mensagem geral anuncia o erro; o campo fica vermelho, com o motivo logo abaixo e o foco nele.
  const postalCode = page.getByLabel('CEP');
  await expect(page.getByRole('alert')).toHaveText('CEP: Este campo é obrigatório.');
  await expect(postalCode).toHaveAttribute('aria-invalid', 'true');
  await expect(postalCode).toHaveCSS('border-color', 'rgb(185, 28, 28)');
  await expect(postalCode).toHaveAccessibleDescription('Este campo é obrigatório.');
  await expect(postalCode).toBeFocused();

  // Ao corrigir o campo, o destaque some.
  await postalCode.fill('01001-000');
  await expect(postalCode).toHaveAttribute('aria-invalid', 'false');
});

test('cliente mostra junto ao campo o motivo recusado pelo servidor', async ({ page }) => {
  await page.route('**/api/v1/clients/client-1', (route) => route.fulfill({
    status: 400,
    json: {
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details: [{ field: 'email', message: 'Informe um e-mail válido.' }],
    },
  }));

  await page.goto('/acceptance/fixture.html?mode=client-edit');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  const email = page.getByLabel('E-mail');
  await expect(page.getByRole('alert')).toHaveText('E-mail: Informe um e-mail válido.');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.');
  await expect(email).toBeFocused();
});

test('os avisos do navegador aparecem em português', async ({ page }) => {
  await page.route('**/api/v1/company', (route) => route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } }));

  await page.goto('/acceptance/fixture.html?mode=company');
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();

  const name = page.getByLabel('Nome profissional ou da empresa');
  await expect(name).toHaveJSProperty('validationMessage', 'Preencha este campo.');
  await expect(name).toHaveCSS('border-color', 'rgb(185, 28, 28)');

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
