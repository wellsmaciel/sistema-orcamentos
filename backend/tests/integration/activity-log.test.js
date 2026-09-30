import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import ActivityLog from '../../src/models/activity-log.js';
import User from '../../src/models/user.js';
import { listActivitiesPage } from '../../src/services/activity-log.js';
import { createClient, deactivateClient, deleteClient, reactivateClient, updateClient } from '../../src/services/client.js';
import { saveCompany } from '../../src/services/company.js';

describe('Registro de atividades dos usuários', () => {
  let transaction;

  async function createTestUser() {
    return User.create(
      {
        auth0Subject: `auth0|activity-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: `${randomUUID()}@example.com`,
        emailVerified: true,
      },
      { transaction },
    );
  }

  function buildClientInput(overrides = {}) {
    return {
      name: 'Maria Cliente',
      email: 'maria@example.com',
      phone: '11999999999',
      address: {
        street: 'Rua das Flores',
        number: '100',
        complement: '',
        postalCode: '01001-000',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      },
      ...overrides,
    };
  }

  function buildCompanyInput(overrides = {}) {
    return {
      name: 'Oficina do Rafael',
      email: 'oficina@example.com',
      phone: '1133334444',
      taxId: '',
      address: {},
      ...overrides,
    };
  }

  async function listActions(userId) {
    const page = await listActivitiesPage(userId, { transaction });

    return page.items.map((item) => item.action);
  }

  beforeAll(async () => {
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('registra o ciclo de vida do cliente, do mais recente para o mais antigo', async () => {
    const user = await createTestUser();
    const client = await createClient(user.id, buildClientInput(), { transaction });

    await updateClient(user.id, client.id, buildClientInput({ phone: '11888888888', address: { ...buildClientInput().address, number: '200' } }), { transaction });
    await deactivateClient(user.id, client.id, { transaction });
    await reactivateClient(user.id, client.id, { transaction });
    await deleteClient(user.id, client.id, { transaction });

    expect(await listActions(user.id)).toEqual(['CLIENT_DELETED', 'CLIENT_REACTIVATED', 'CLIENT_DEACTIVATED', 'CLIENT_UPDATED', 'CLIENT_CREATED']);
  });

  test('guarda somente os nomes dos campos alterados, nunca os valores', async () => {
    const user = await createTestUser();
    const client = await createClient(user.id, buildClientInput(), { transaction });

    await updateClient(user.id, client.id, buildClientInput({ phone: '11888888888', address: { ...buildClientInput().address, street: 'Rua Nova' } }), { transaction });

    const [updated] = (await listActivitiesPage(user.id, { transaction })).items;
    expect(updated).toMatchObject({ action: 'CLIENT_UPDATED', entityType: 'CLIENT', entityId: client.id, changedFields: ['address', 'phone'] });

    const stored = await ActivityLog.findAll({ where: { userId: user.id }, transaction });
    expect(JSON.stringify(stored.map((row) => row.details))).not.toMatch(/11888888888|Rua Nova|Maria/);
  });

  test('não registra alteração quando nada mudou nem inativação repetida', async () => {
    const user = await createTestUser();
    const client = await createClient(user.id, buildClientInput(), { transaction });

    await updateClient(user.id, client.id, buildClientInput(), { transaction });
    await deactivateClient(user.id, client.id, { transaction });
    await deactivateClient(user.id, client.id, { transaction });

    expect(await listActions(user.id)).toEqual(['CLIENT_DEACTIVATED', 'CLIENT_CREATED']);
  });

  test('mostra o nome atual do cliente e deixa de mostrá-lo depois da exclusão', async () => {
    const user = await createTestUser();
    const client = await createClient(user.id, buildClientInput(), { transaction });

    expect((await listActivitiesPage(user.id, { transaction })).items[0].entityName).toBe('Maria Cliente');

    await deleteClient(user.id, client.id, { transaction });

    const items = (await listActivitiesPage(user.id, { transaction })).items;
    expect(items.map((item) => item.entityName)).toEqual([null, null]);
  });

  test('registra a criação e a alteração do perfil profissional', async () => {
    const user = await createTestUser();

    await saveCompany(user.id, buildCompanyInput(), { transaction });
    await saveCompany(user.id, buildCompanyInput({ phone: '1144445555' }), { transaction });
    await saveCompany(user.id, buildCompanyInput({ phone: '1144445555' }), { transaction });

    const items = (await listActivitiesPage(user.id, { transaction })).items;
    expect(items.map((item) => item.action)).toEqual(['COMPANY_UPDATED', 'COMPANY_CREATED']);
    expect(items[0]).toMatchObject({ entityType: 'COMPANY', changedFields: ['phone'], entityName: null });
  });

  test('cada prestador vê somente as próprias atividades', async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();
    const client = await createClient(owner.id, buildClientInput(), { transaction });

    await updateClient(otherUser.id, client.id, buildClientInput({ phone: '11777777777' }), { transaction });
    await deleteClient(otherUser.id, client.id, { transaction });

    expect(await listActions(owner.id)).toEqual(['CLIENT_CREATED']);
    expect(await listActions(otherUser.id)).toEqual([]);
  });

  test('pagina as atividades', async () => {
    const user = await createTestUser();

    for (let index = 0; index < 3; index += 1) {
      await createClient(user.id, buildClientInput({ name: `Cliente ${index}` }), { transaction });
    }

    const page = await listActivitiesPage(user.id, { page: 2, pageSize: 2, transaction });
    expect(page).toMatchObject({ total: 3, page: 2, pageSize: 2, totalPages: 2 });
    expect(page.items.map((item) => item.entityName)).toEqual(['Cliente 0']);
  });
});
