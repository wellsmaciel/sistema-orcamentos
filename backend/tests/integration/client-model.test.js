import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import User from '../../src/models/user.js';

describe('Modelo Client', () => {
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

  test('deve persistir um cliente relacionado a um usuário', async () => {
    const user = await User.create(
      {
        auth0Subject: `auth0|client-test-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: 'prestador@example.com',
        emailVerified: true,
      },
      {
        transaction,
      },
    );

    const client = await Client.create(
      {
        userId: user.id,
        name: 'Cliente de Teste',
        email: 'cliente@example.com',
        phone: '11999999999',
        street: 'Rua de Teste',
        number: '100',
        complement: 'Sala 2',
        postalCode: '01001000',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      },
      {
        transaction,
      },
    );

    expect(client.id).toBeDefined();
    expect(client.userId).toBe(user.id);
    expect(client.name).toBe('Cliente de Teste');
    expect(client.active).toBe(true);
  });
});
