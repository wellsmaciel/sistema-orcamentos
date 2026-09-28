import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Company from '../../src/models/company.js';
import User from '../../src/models/user.js';

describe('Modelo Company', () => {
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

  test('deve persistir os dados profissionais do proprietário', async () => {
    const user = await User.create(
      {
        auth0Subject: `auth0|company-test-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: 'prestador@example.com',
        emailVerified: true,
      },
      {
        transaction,
      },
    );

    const company = await Company.create(
      {
        ownerUserId: user.id,
        name: 'Prestador de Teste Serviços',
        email: 'contato@example.com',
        phone: '11999999999',
        taxId: '12.345.678/0001-90',
        street: 'Rua de Teste',
        number: '100',
        complement: null,
        postalCode: '01001-000',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      },
      {
        transaction,
      },
    );

    expect(company.id).toBeDefined();
    expect(company.ownerUserId).toBe(user.id);
    expect(company.name).toBe('Prestador de Teste Serviços');
    expect(company.email).toBe('contato@example.com');
    expect(company.taxId).toBe('12.345.678/0001-90');
    expect(company.postalCode).toBe('01001-000');
    expect(company.active).toBe(true);
  });

  test('não deve permitir dois perfis profissionais para o mesmo proprietário', async () => {
    const user = await User.create(
      {
        auth0Subject: `auth0|company-unique-test-${randomUUID()}`,
        name: 'Outro Prestador',
        email: 'outro@example.com',
        emailVerified: true,
      },
      {
        transaction,
      },
    );

    const companyData = {
      ownerUserId: user.id,
      name: 'Empresa de Teste',
      email: 'empresa@example.com',
      phone: '11988888888',
    };

    await Company.create(companyData, {
      transaction,
    });

    await expect(
      Company.create(
        {
          ...companyData,
          name: 'Segunda Empresa',
        },
        {
          transaction,
        },
      ),
    ).rejects.toMatchObject({
      name: 'SequelizeUniqueConstraintError',
    });
  });
});
