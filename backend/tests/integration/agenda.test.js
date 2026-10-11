import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import Company from '../../src/models/company.js';
import User from '../../src/models/user.js';
import { listUpcomingServices } from '../../src/services/agenda.js';
import { confirmQuote, createQuote, respondToPublicQuote } from '../../src/services/quote.js';

describe('Agenda de próximos serviços', () => {
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

  async function createProvider() {
    const user = await User.create(
      { auth0Subject: `auth0|agenda-${randomUUID()}`, name: 'Prestador da Agenda', email: `${randomUUID()}@example.com`, emailVerified: true },
      { transaction },
    );

    await Company.create({ ownerUserId: user.id, name: 'Oficina', email: 'oficina@example.com', phone: '1133334444' }, { transaction });

    const client = await Client.create(
      {
        userId: user.id, name: 'Maria Cliente', email: 'maria@example.com', phone: '11999999999',
        street: 'Rua do Cliente', number: '100', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP',
      },
      { transaction },
    );

    return { user, client };
  }

  async function createQuoteOn(userId, clientId, serviceDate, decision) {
    const quote = await createQuote(
      userId,
      {
        clientId,
        description: `Serviço do dia ${serviceDate}`,
        pricingMode: 'FIXED_TOTAL',
        items: [{ description: 'Mão de obra', quantity: '1' }],
        totalAmount: '500',
        serviceDate,
        serviceAddress: { street: 'Rua do Serviço', number: '10', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP' },
      },
      { transaction },
    );

    if (!decision) {
      return quote;
    }

    const { quote: sentQuote } = await confirmQuote(userId, quote.id, { transaction });

    if (decision === 'SENT') {
      return sentQuote;
    }

    const { quote: answeredQuote } = await respondToPublicQuote(sentQuote.publicToken, { decision }, { transaction });

    return answeredQuote;
  }

  // "Hoje" para a agenda: 15/10/2099 ao meio-dia no horário de Brasília.
  const NOW = new Date('2099-10-15T12:00:00-03:00');

  test('mostra só os aceitos de hoje em diante, do mais próximo para o mais distante', async () => {
    const { user, client } = await createProvider();
    const later = await createQuoteOn(user.id, client.id, '2099-10-20', 'ACCEPTED');
    const today = await createQuoteOn(user.id, client.id, '2099-10-15', 'ACCEPTED');
    await createQuoteOn(user.id, client.id, '2099-10-10', 'ACCEPTED');
    await createQuoteOn(user.id, client.id, '2099-10-16', 'SENT');
    await createQuoteOn(user.id, client.id, '2099-10-17', 'REJECTED');
    await createQuoteOn(user.id, client.id, '2099-10-18');

    const agenda = await listUpcomingServices(user.id, { now: NOW, transaction });

    expect(agenda.today).toBe('2099-10-15');
    expect(agenda.total).toBe(2);
    expect(agenda.items.map((item) => item.quoteId)).toEqual([today.id, later.id]);
    expect(agenda.items[0]).toEqual(expect.objectContaining({
      quoteNumber: today.quoteNumber,
      clientName: 'Maria Cliente',
      description: 'Serviço do dia 2099-10-15',
      totalAmount: '500.00',
      serviceDate: '2099-10-15',
      serviceAddress: expect.objectContaining({ street: 'Rua do Serviço', number: '10', city: 'São Paulo', state: 'SP' }),
    }));
  });

  test('limita a lista e informa o total, e cada prestador vê só a própria agenda', async () => {
    const { user, client } = await createProvider();
    const { user: otherUser, client: otherClient } = await createProvider();

    for (const day of ['16', '17', '18', '19', '20', '21']) {
      await createQuoteOn(user.id, client.id, `2099-10-${day}`, 'ACCEPTED');
    }
    await createQuoteOn(otherUser.id, otherClient.id, '2099-10-16', 'ACCEPTED');

    const agenda = await listUpcomingServices(user.id, { now: NOW, transaction });

    expect(agenda.total).toBe(6);
    expect(agenda.items.map((item) => item.serviceDate)).toEqual(['2099-10-16', '2099-10-17', '2099-10-18', '2099-10-19', '2099-10-20']);

    const empty = await listUpcomingServices((await createProvider()).user.id, { now: NOW, transaction });
    expect(empty).toEqual({ today: '2099-10-15', total: 0, items: [] });
  });
});
