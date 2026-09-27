import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import User from '../../src/models/user.js';
import { createQuote } from '../../src/services/quote.js';

describe('Serviço de orçamentos', () => {
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

  async function createUser(name) {
    return User.create(
      {
        auth0Subject: `auth0|quote-service-${randomUUID()}`,
        name,
        email: `${randomUUID()}@example.com`,
        emailVerified: true,
      },
      {
        transaction,
      },
    );
  }

  async function createClient(userId, active = true) {
    return Client.create(
      {
        userId,
        name: 'Cliente de Teste',
        email: 'cliente@example.com',
        phone: '11999999999',
        street: 'Rua do Cliente',
        number: '100',
        complement: null,
        postalCode: '01001-000',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        active,
      },
      {
        transaction,
      },
    );
  }

  function buildQuoteInput(clientId) {
    return {
      clientId,
      description: '  Execução do serviço solicitado.  ',
      totalAmount: '1500.5',
      serviceDate: '2026-10-15',
      serviceAddress: {
        street: '  Avenida do Serviço  ',
        number: '  200  ',
        complement: '   ',
        postalCode: '  02002-000  ',
        district: '  Bairro do Serviço  ',
        city: '  São Paulo  ',
        state: '  SP  ',
      },
      locationNotes: '  Entrar em contato antes da visita.  ',
    };
  }

  test('deve criar o rascunho e copiar os dados do cliente', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    expect(quote).not.toBeNull();
    expect(quote.userId).toBe(user.id);
    expect(quote.clientId).toBe(client.id);
    expect(quote.clientName).toBe(client.name);
    expect(quote.clientEmail).toBe(client.email);
    expect(quote.totalAmount).toBe('1500.50');
    expect(quote.description).toBe('Execução do serviço solicitado.');
    expect(quote.serviceStreet).toBe('Avenida do Serviço');
    expect(quote.serviceComplement).toBeNull();
    expect(quote.locationNotes).toBe('Entrar em contato antes da visita.');
    expect(quote.status).toBe('DRAFT');
  });

  test('não deve usar cliente pertencente a outro usuário', async () => {
    const owner = await createUser('Proprietário do Cliente');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(owner.id);

    const quote = await createQuote(otherUser.id, buildQuoteInput(client.id), {
      transaction,
    });

    expect(quote).toBeNull();
  });

  test('não deve usar cliente inativo', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id, false);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    expect(quote).toBeNull();
  });
});
