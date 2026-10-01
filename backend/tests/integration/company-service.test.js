import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Company from '../../src/models/company.js';
import User from '../../src/models/user.js';
import { getCompany, saveCompany } from '../../src/services/company.js';

describe('Serviço de dados profissionais', () => {
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

  async function createUser(prefix) {
    return User.create(
      {
        auth0Subject: `auth0|${prefix}-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: `${prefix}@example.com`,
        emailVerified: true,
      },
      {
        transaction,
      },
    );
  }

  test('deve criar e normalizar os dados profissionais', async () => {
    const user = await createUser('company-create');

    const company = await saveCompany(
      user.id,
      {
        name: '  Prestador de Teste Serviços  ',
        email: '  CONTATO@EXAMPLE.COM  ',
        phone: '  (11) 99999-9999  ',
        taxId: '  12.345.678/0001-90  ',
      },
      {
        transaction,
      },
    );

    expect(company.ownerUserId).toBe(user.id);
    expect(company.name).toBe('Prestador de Teste Serviços');
    expect(company.email).toBe('contato@example.com');
    expect(company.phone).toBe('(11) 99999-9999');
    expect(company.taxId).toBe('12.345.678/0001-90');
    expect(company.street).toBeNull();
    expect(company.active).toBe(true);
  });

  test('deve atualizar o perfil existente sem criar outro registro', async () => {
    const user = await createUser('company-update');

    const createdCompany = await saveCompany(
      user.id,
      {
        name: 'Nome Inicial',
        email: 'inicial@example.com',
        phone: '11999999999',
      },
      {
        transaction,
      },
    );

    const updatedCompany = await saveCompany(
      user.id,
      {
        name: '  Nome Atualizado  ',
        email: '  ATUALIZADO@EXAMPLE.COM  ',
        phone: '  11988888888  ',
        taxId: '',
        address: {
          street: '  Rua Atualizada  ',
          number: '  200  ',
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

    const companyCount = await Company.count({
      where: {
        ownerUserId: user.id,
      },
      transaction,
    });

    expect(updatedCompany.id).toBe(createdCompany.id);
    expect(updatedCompany.name).toBe('Nome Atualizado');
    expect(updatedCompany.email).toBe('atualizado@example.com');
    expect(updatedCompany.taxId).toBeNull();
    expect(updatedCompany.street).toBe('Rua Atualizada');
    expect(updatedCompany.complement).toBeNull();
    expect(companyCount).toBe(1);
  });

  test('deve consultar somente o perfil pertencente ao usuário', async () => {
    const user = await createUser('company-owner');
    const otherUser = await createUser('company-other');

    await saveCompany(
      user.id,
      {
        name: 'Perfil do Proprietário',
        email: 'proprietario@example.com',
        phone: '11999999999',
      },
      {
        transaction,
      },
    );

    const ownerCompany = await getCompany(user.id, {
      transaction,
    });

    const otherCompany = await getCompany(otherUser.id, {
      transaction,
    });

    expect(ownerCompany.name).toBe('Perfil do Proprietário');
    expect(otherCompany).toBeNull();
  });
});
