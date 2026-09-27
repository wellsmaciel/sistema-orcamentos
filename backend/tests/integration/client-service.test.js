import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import User from '../../src/models/user.js';
import { createClient, listClients } from '../../src/services/client.js';

describe('Serviço de clientes', () => {
  let transaction;

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
});
