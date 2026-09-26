import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import User from '../../src/models/user.js';
import { provisionUser } from '../../src/services/user.js';

describe('Serviço de provisionamento de usuário', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  test('deve criar o usuário e atualizá-lo sem duplicar o registro', async () => {
    const auth0Subject = `auth0|service-test-${randomUUID()}`;

    try {
      const createdUser = await provisionUser({
        sub: auth0Subject,
        name: 'Nome Inicial',
        email: 'inicial@example.com',
        email_verified: false,
      });

      const updatedUser = await provisionUser({
        sub: auth0Subject,
        name: 'Nome Atualizado',
        email: 'atualizado@example.com',
        email_verified: true,
      });

      const numberOfUsers = await User.count({
        where: {
          auth0Subject,
        },
      });

      expect(updatedUser.id).toBe(createdUser.id);
      expect(updatedUser.name).toBe('Nome Atualizado');
      expect(updatedUser.email).toBe('atualizado@example.com');
      expect(updatedUser.emailVerified).toBe(true);
      expect(numberOfUsers).toBe(1);
    } finally {
      await User.destroy({
        where: {
          auth0Subject,
        },
        force: true,
      });
    }
  });
});
