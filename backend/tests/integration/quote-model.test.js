import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import Quote from '../../src/models/quote.js';
import User from '../../src/models/user.js';

describe('Modelo Quote', () => {
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

  test('deve persistir um orçamento em rascunho', async () => {
    const user = await User.create(
      {
        auth0Subject: `auth0|quote-test-${randomUUID()}`,
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
        street: 'Rua do Cliente',
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

    const quote = await Quote.create(
      {
        userId: user.id,
        quoteNumber: 1,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        description: 'Execução do serviço descrito pelo prestador.',
        totalAmount: '1500.50',
        serviceDate: '2026-10-15',
        serviceStreet: client.street,
        serviceNumber: client.number,
        serviceComplement: client.complement,
        servicePostalCode: client.postalCode,
        serviceDistrict: client.district,
        serviceCity: client.city,
        serviceState: client.state,
        locationNotes: 'Entrar em contato antes da visita.',
        pricingMode: 'FIXED_TOTAL',
      },
      {
        transaction,
      },
    );

    expect(quote.id).toBeDefined();
    expect(quote.quoteNumber).toEqual(expect.any(Number));
    expect(quote.quoteNumber).toBeGreaterThan(0);
    expect(quote.userId).toBe(user.id);
    expect(quote.clientId).toBe(client.id);
    expect(quote.clientName).toBe('Cliente de Teste');
    expect(quote.totalAmount).toBe('1500.50');
    expect(quote.serviceDate).toBe('2026-10-15');
    expect(quote.status).toBe('DRAFT');
    expect(quote.publicToken).toBeNull();
    expect(quote.sentAt).toBeNull();
    expect(quote.respondedAt).toBeNull();
    expect(quote.rejectionReason).toBeNull();
    expect(quote.correctedFromId).toBeNull();
    expect(quote.pricingMode).toBe('FIXED_TOTAL');
  });
});
