import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import User from '../../src/models/user.js';
import { createClient, listClients, updateClient, deleteClient, deactivateClient, reactivateClient, listClientsPage } from '../../src/services/client.js';
import Client from '../../src/models/client.js';
import { createQuote } from '../../src/services/quote.js';

describe('Serviço de clientes', () => {
  let transaction;

  async function createTestUser() {
    return User.create(
      {
        auth0Subject: `auth0|client-management-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: `${randomUUID()}@example.com`,
        emailVerified: true,
      },
      {
        transaction,
      },
    );
  }

  function buildTestClientInput() {
    return {
      name: 'Cliente Original',
      email: 'cliente@example.com',
      phone: '11999999999',
      address: {
        street: 'Rua Original',
        number: '100',
        complement: 'Sala 1',
        postalCode: '01001-000',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      },
    };
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

  test('deve criar e normalizar os dados do cliente', async () => {
    const user = await User.create(
      {
        auth0Subject: `auth0|client-service-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: 'prestador@example.com',
        emailVerified: true,
      },
      {
        transaction,
      },
    );

    const client = await createClient(
      user.id,
      {
        name: '  Cliente de Teste  ',
        email: '  CLIENTE@EXAMPLE.COM  ',
        phone: '  (11) 99999-9999  ',
        address: {
          street: '  Rua de Teste  ',
          number: '  100  ',
          complement: '   ',
          postalCode: '  01001-000  ',
          district: '  Centro  ',
          city: '  São Paulo  ',
          state: '  SP  ',
        },
      },
      {
        transaction,
      },
    );

    expect(client.userId).toBe(user.id);
    expect(client.name).toBe('Cliente de Teste');
    expect(client.email).toBe('cliente@example.com');
    expect(client.phone).toBe('(11) 99999-9999');
    expect(client.street).toBe('Rua de Teste');
    expect(client.postalCode).toBe('01001-000');
    expect(client.complement).toBeNull();
  });
  test('deve listar somente os clientes ativos do usuário em ordem alfabética', async () => {
    const user = await User.create(
      {
        auth0Subject: `auth0|client-list-${randomUUID()}`,
        name: 'Prestador da Lista',
        email: 'prestador-lista@example.com',
        emailVerified: true,
      },
      {
        transaction,
      },
    );

    const otherUser = await User.create(
      {
        auth0Subject: `auth0|other-client-list-${randomUUID()}`,
        name: 'Outro Prestador',
        email: 'outro-prestador@example.com',
        emailVerified: true,
      },
      {
        transaction,
      },
    );

    function buildClientInput(name, email) {
      return {
        name,
        email,
        phone: '11999999999',
        address: {
          street: 'Rua de Teste',
          number: '100',
          complement: '',
          postalCode: '01001-000',
          district: 'Centro',
          city: 'São Paulo',
          state: 'SP',
        },
      };
    }

    await createClient(user.id, buildClientInput('Cliente Zeta', 'zeta@example.com'), { transaction });

    await createClient(user.id, buildClientInput('Cliente Alfa', 'alfa@example.com'), { transaction });

    const inactiveClient = await createClient(user.id, buildClientInput('Cliente Inativo', 'inativo@example.com'), { transaction });

    await inactiveClient.update(
      {
        active: false,
      },
      {
        transaction,
      },
    );

    await createClient(otherUser.id, buildClientInput('Cliente de Outro Usuário', 'outro@example.com'), { transaction });

    const clients = await listClients(user.id, { transaction });

    expect(clients.map((client) => client.name)).toEqual(['Cliente Alfa', 'Cliente Zeta']);

    expect(clients.every((client) => client.userId === user.id)).toBe(true);
    expect(clients.every((client) => client.active)).toBe(true);
  });
  test('deve atualizar e normalizar os dados do cliente', async () => {
    const user = await createTestUser();

    const client = await createClient(user.id, buildTestClientInput(), { transaction });

    const result = await updateClient(
      user.id,
      client.id,
      {
        name: '  Cliente Atualizado  ',
        email: '  ATUALIZADO@EXAMPLE.COM  ',
        phone: '  11988887777  ',
        address: {
          street: '  Rua Nova  ',
          number: '  200  ',
          complement: '   ',
          postalCode: '  02002-000  ',
          district: '  Bairro Novo  ',
          city: '  Campinas  ',
          state: '  SP  ',
        },
      },
      { transaction },
    );

    expect(result.outcome).toBe('UPDATED');

    await client.reload({ transaction });

    expect(client.id).toBe(result.client.id);
    expect(client.userId).toBe(user.id);
    expect(client.name).toBe('Cliente Atualizado');
    expect(client.email).toBe('atualizado@example.com');
    expect(client.phone).toBe('11988887777');
    expect(client.street).toBe('Rua Nova');
    expect(client.number).toBe('200');
    expect(client.complement).toBeNull();
    expect(client.postalCode).toBe('02002-000');
    expect(client.district).toBe('Bairro Novo');
    expect(client.city).toBe('Campinas');
    expect(client.state).toBe('SP');
    expect(client.active).toBe(true);
  });

  test('não deve atualizar cliente de outro usuário', async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();

    const client = await createClient(owner.id, buildTestClientInput(), { transaction });

    const result = await updateClient(
      otherUser.id,
      client.id,
      {
        ...buildTestClientInput(),
        name: 'Alteração indevida',
      },
      { transaction },
    );

    expect(result).toEqual({
      outcome: 'NOT_FOUND',
    });

    await client.reload({ transaction });

    expect(client.name).toBe('Cliente Original');
    expect(client.userId).toBe(owner.id);
  });
  test('deve excluir um cliente sem orçamento vinculado', async () => {
    const user = await createTestUser();

    const client = await createClient(user.id, buildTestClientInput(), { transaction });

    const result = await deleteClient(user.id, client.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'DELETED',
    });

    const deletedClient = await Client.findByPk(client.id, {
      transaction,
    });

    expect(deletedClient).toBeNull();
  });

  test('não deve excluir um cliente com orçamento vinculado', async () => {
    const user = await createTestUser();
    const input = buildTestClientInput();

    const client = await createClient(user.id, input, {
      transaction,
    });

    const quote = await createQuote(
      user.id,
      {
        clientId: client.id,
        description: 'Serviço de teste',
        pricingMode: 'FIXED_TOTAL',
        items: [{ description: 'Serviço de teste', quantity: '1' }],
        totalAmount: '100.00',
        serviceDate: '2026-12-31',
        serviceAddress: input.address,
      },
      { transaction },
    );

    const result = await deleteClient(user.id, client.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'HAS_QUOTES',
    });

    const preservedClient = await Client.findByPk(client.id, {
      transaction,
    });

    expect(preservedClient).not.toBeNull();

    await quote.reload({ transaction });

    expect(quote.clientId).toBe(client.id);
  });

  test('não deve excluir cliente de outro usuário', async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();

    const client = await createClient(owner.id, buildTestClientInput(), { transaction });

    const result = await deleteClient(otherUser.id, client.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_FOUND',
    });

    const preservedClient = await Client.findByPk(client.id, {
      transaction,
    });

    expect(preservedClient).not.toBeNull();
    expect(preservedClient.userId).toBe(owner.id);
  });
  test('deve inativar o cliente e removê-lo da lista de ativos', async () => {
    const user = await createTestUser();

    const client = await createClient(user.id, buildTestClientInput(), { transaction });

    const result = await deactivateClient(user.id, client.id, {
      transaction,
    });

    expect(result.outcome).toBe('DEACTIVATED');

    await client.reload({ transaction });

    expect(client.active).toBe(false);
    expect(client.name).toBe('Cliente Original');

    const clients = await listClients(user.id, { transaction });

    expect(clients).toEqual([]);
  });

  test('não deve inativar cliente de outro usuário', async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();

    const client = await createClient(owner.id, buildTestClientInput(), { transaction });

    const result = await deactivateClient(otherUser.id, client.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_FOUND',
    });

    await client.reload({ transaction });

    expect(client.active).toBe(true);
  });
  test('deve reativar um cliente e incluí-lo na lista de ativos', async () => {
    const user = await createTestUser();

    const client = await createClient(user.id, buildTestClientInput(), { transaction });

    await deactivateClient(user.id, client.id, { transaction });

    const result = await reactivateClient(user.id, client.id, {
      transaction,
    });

    expect(result.outcome).toBe('REACTIVATED');

    await client.reload({ transaction });

    expect(client.active).toBe(true);

    const clients = await listClients(user.id, { transaction });

    expect(clients.map((item) => item.id)).toContain(client.id);
  });

  test('não deve reativar cliente de outro usuário', async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();

    const client = await createClient(owner.id, buildTestClientInput(), { transaction });

    await deactivateClient(owner.id, client.id, { transaction });

    const result = await reactivateClient(otherUser.id, client.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_FOUND',
    });

    await client.reload({ transaction });

    expect(client.active).toBe(false);
  });
  test('deve buscar clientes inativos pelo nome somente do usuário', async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();

    const inactiveClient = await createClient(
      user.id,
      {
        ...buildTestClientInput(),
        name: 'Maria Inativa',
      },
      { transaction },
    );

    await deactivateClient(user.id, inactiveClient.id, { transaction });

    await createClient(
      user.id,
      {
        ...buildTestClientInput(),
        name: 'Maria Ativa',
      },
      { transaction },
    );

    const otherClient = await createClient(
      otherUser.id,
      {
        ...buildTestClientInput(),
        name: 'Maria de Outra Conta',
      },
      { transaction },
    );

    await deactivateClient(otherUser.id, otherClient.id, { transaction });

    const result = await listClientsPage(user.id, {
      active: false,
      search: 'MARIA',
      transaction,
    });

    expect(result.items.map((client) => client.id)).toEqual([inactiveClient.id]);
    expect(result.total).toBe(1);
  });

  test('deve paginar clientes em ordem alfabética', async () => {
    const user = await createTestUser();

    for (const name of ['Cliente Zeta', 'Cliente Alfa', 'Cliente Beta']) {
      await createClient(
        user.id,
        {
          ...buildTestClientInput(),
          name,
        },
        { transaction },
      );
    }

    const result = await listClientsPage(user.id, {
      page: 2,
      pageSize: 2,
      transaction,
    });

    expect(result.items.map((client) => client.name)).toEqual(['Cliente Zeta']);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(2);
    expect(result.totalPages).toBe(2);
  });
});
