import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import User from '../../src/models/user.js';

describe('Modelo User', () => {
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

  test('deve persistir um usuário com UUID gerado pelo PostgreSQL', async () => {
    const user = await User.create(
      {
        auth0Subject: `auth0|test-${randomUUID()}`,
        name: 'Usuário de Teste',
        email: 'usuario.teste@example.com',
        emailVerified: true,
      },
      {
        transaction,
      },
    );

    expect(user.id).toBeDefined();
    expect(user.auth0Subject).toContain('auth0|test-');
    expect(user.email).toBe('usuario.teste@example.com');
    expect(user.emailVerified).toBe(true);
    expect(user.active).toBe(true);
  });
});
