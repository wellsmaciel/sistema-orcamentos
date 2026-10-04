import { expect, test } from '@playwright/test';

const heading = (page, view) => page.getByRole('heading', { name: `Tela: ${view}` });

test('o Voltar do navegador volta para a tela anterior do app, sem sair dele', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=navigation');
  await expect(heading(page, 'home')).toBeVisible();

  await page.getByRole('button', { name: 'Ir para orçamentos' }).click();
  await page.getByRole('button', { name: 'Editar orçamento 7' }).click();
  await expect(page.getByText('Editando orçamento 7')).toBeVisible();

  await page.goBack();
  await expect(heading(page, 'quotes')).toBeVisible();

  await page.goForward();
  await expect(page.getByText('Editando orçamento 7')).toBeVisible();

  await page.goBack();
  await page.goBack();
  await expect(heading(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/mode=navigation/);
});

test('depois de salvar, o Voltar não reabre o formulário já enviado', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=navigation');
  await page.getByRole('button', { name: 'Ir para orçamentos' }).click();
  await page.getByRole('button', { name: 'Editar orçamento 7' }).click();
  await page.getByRole('button', { name: 'Salvar edição' }).click();
  await expect(page.getByText('Destaque: orçamento 7')).toBeVisible();

  await page.goBack();
  await expect(heading(page, 'quotes')).toBeVisible();
  await expect(page.getByText('Editando orçamento 7')).toHaveCount(0);

  await page.goBack();
  await expect(heading(page, 'home')).toBeVisible();
});

test('cancelar um formulário volta para a lista sem criar entrada nova no histórico', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=navigation');
  await page.getByRole('button', { name: 'Ir para clientes' }).click();
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(heading(page, 'clients')).toBeVisible();

  // O Voltar do navegador não reabre o formulário cancelado: vai para a tela de antes da lista.
  await page.goBack();
  await expect(heading(page, 'home')).toBeVisible();
});

test('cancelar um formulário aberto fora da lista leva à lista, sem sair do app', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=navigation');
  await page.getByRole('button', { name: 'Editar orçamento 7' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(heading(page, 'quotes')).toBeVisible();

  await page.goBack();
  await expect(heading(page, 'home')).toBeVisible();
  await expect(page).toHaveURL(/mode=navigation/);
});

test('ao recarregar, continua na mesma tela; um formulário de edição volta para a lista', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=navigation');
  await page.getByRole('button', { name: 'Ir para orçamentos' }).click();
  await page.reload();
  await expect(heading(page, 'quotes')).toBeVisible();

  await page.getByRole('button', { name: 'Editar orçamento 7' }).click();
  await page.reload();
  await expect(heading(page, 'quotes')).toBeVisible();
  await expect(page.getByText('Editando orçamento 7')).toHaveCount(0);
});

test('o histórico do navegador não guarda dados pessoais e é limpo ao sair', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=navigation');
  await page.getByRole('button', { name: 'Editar orçamento 7' }).click();
  await expect(page.getByText('Editando orçamento 7')).toBeVisible();

  const savedState = JSON.stringify(await page.evaluate(() => window.history.state));
  expect(savedState).toContain('"view":"edit-quote"');
  expect(savedState).toContain('"owner":"auth0|usuario-a"');
  for (const personalData of ['maria@example.com', 'Maria Cliente', '99999-8888']) {
    expect(savedState).not.toContain(personalData);
  }

  await page.evaluate(() => window.history.replaceState({ ...window.history.state, outroDado: 'preservado' }, ''));
  await page.getByRole('button', { name: 'Sair' }).click();

  const stateAfterLogout = await page.evaluate(() => window.history.state);
  expect(stateAfterLogout.appNavigation).toBeUndefined();
  expect(stateAfterLogout.outroDado).toBe('preservado');
});
