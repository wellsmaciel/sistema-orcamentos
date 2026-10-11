import { expect, test } from '@playwright/test';

const MISSING_NINE = 'Parece um celular sem o 9 na frente. Celulares têm 9 dígitos depois do DDD, por exemplo (11) 96564-8484.';

test('celular sem o 9 é avisado ao sair do campo, e o aviso some ao voltar a digitar', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=client-edit');
  const phone = page.getByLabel('Telefone', { exact: true });

  await phone.fill('1165648484');
  await phone.blur();
  await expect(page.getByRole('alert')).toHaveText(MISSING_NINE);
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(phone).toHaveValue('1165648484');

  await phone.fill('11965648484');
  await expect(phone).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await phone.blur();
  await expect(phone).toHaveValue('(11) 96564-8484');
});

test.describe('CPF ou CNPJ no perfil', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/company', (route) => route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } }));
    await page.goto('/acceptance/fixture.html?mode=company');
  });

  test('CNPJ alfanumérico é aceito e padronizado em maiúsculas', async ({ page }) => {
    const taxId = page.getByLabel('CPF ou CNPJ');

    await taxId.fill('12abc34501de35');
    await taxId.blur();

    await expect(taxId).toHaveValue('12.ABC.345/01DE-35');
    await expect(taxId).toHaveAttribute('aria-invalid', 'false');
  });

  test('CPF com dígito verificador errado é avisado ao sair do campo', async ({ page }) => {
    const taxId = page.getByLabel('CPF ou CNPJ');

    await taxId.fill('123.456.789-01');
    await taxId.blur();

    await expect(page.getByRole('alert')).toHaveText('CPF inválido: confira os números.');
    await expect(taxId).toHaveAttribute('aria-invalid', 'true');
  });
});
