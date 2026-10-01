import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import Company from '../../src/models/company.js';
import User from '../../src/models/user.js';
import { getManagementSummary } from '../../src/services/management.js';
import { confirmQuote, createQuote, respondToPublicQuote } from '../../src/services/quote.js';

const NOW = new Date('2026-10-15T12:00:00-03:00');

describe('Resumo da área de gestão', () => {
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
      { auth0Subject: `auth0|management-${randomUUID()}`, name: 'Prestador', email: `${randomUUID()}@example.com`, emailVerified: true },
      { transaction },
    );
    await Company.create({ ownerUserId: user.id, name: 'Oficina', email: 'oficina@example.com', phone: '(11) 3333-4444' }, { transaction });

    return user;
  }

  async function createClient(userId, name) {
    return Client.create(
      {
        userId, name, email: 'cliente@example.com', phone: '(11) 99999-8888',
        street: 'Rua', number: '1', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP',
      },
      { transaction },
    );
  }

  async function createQuoteWith(userId, clientId, { amount, status = 'DRAFT', createdAt, sentAt, respondedAt }) {
    let quote = await createQuote(
      userId,
      {
        clientId,
        description: 'Serviço',
        pricingMode: 'FIXED_TOTAL',
        items: [{ description: 'Mão de obra', quantity: '1' }],
        totalAmount: amount,
        serviceDate: '2099-10-15',
        serviceAddress: { street: 'Rua', number: '1', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP' },
      },
      { transaction },
    );

    if (status !== 'DRAFT') {
      ({ quote } = await confirmQuote(userId, quote.id, { transaction }));
    }

    if (status === 'ACCEPTED' || status === 'REJECTED') {
      await respondToPublicQuote(quote.publicToken, { decision: status }, { transaction });
    }

    // Ajusta as datas diretamente no banco para controlar períodos e tempos de resposta.
    await sequelize.query(
      `UPDATE quotes SET created_at = :createdAt,
              sent_at = COALESCE(:sentAt, sent_at),
              responded_at = COALESCE(:respondedAt, responded_at)
        WHERE id = :id`,
      { replacements: { id: quote.id, createdAt, sentAt: sentAt ?? null, respondedAt: respondedAt ?? null }, transaction },
    );

    return quote;
  }

  test('sem orçamentos, os indicadores ficam zerados', async () => {
    const user = await createProvider();

    const summary = await getManagementSummary(user.id, { now: NOW, transaction });

    expect(summary).toMatchObject({
      period: 'month',
      totalQuotes: 0,
      statusCounts: { DRAFT: 0, SENT: 0, ACCEPTED: 0, REJECTED: 0 },
      acceptanceRate: null,
      acceptedAmount: '0.00',
      openAmount: '0.00',
      averageResponseHours: null,
      awaitingResponse: [],
      topClients: [],
    });
  });

  test('calcula situação, taxa de aceite, valores, tempo de resposta e listas do mês', async () => {
    const user = await createProvider();
    const maria = await createClient(user.id, 'Maria');
    const joao = await createClient(user.id, 'João');

    await createQuoteWith(user.id, maria.id, { amount: '100', createdAt: '2026-10-02T10:00:00-03:00' });
    await createQuoteWith(user.id, maria.id, { amount: '300', status: 'SENT', createdAt: '2026-10-03T10:00:00-03:00', sentAt: '2026-10-03T10:00:00-03:00' });
    const recentSent = await createQuoteWith(user.id, joao.id, { amount: '200', status: 'SENT', createdAt: '2026-10-10T10:00:00-03:00', sentAt: '2026-10-10T10:00:00-03:00' });
    await createQuoteWith(user.id, maria.id, { amount: '1000', status: 'ACCEPTED', createdAt: '2026-10-04T10:00:00-03:00', sentAt: '2026-10-04T10:00:00-03:00', respondedAt: '2026-10-04T14:00:00-03:00' });
    await createQuoteWith(user.id, joao.id, { amount: '500.50', status: 'ACCEPTED', createdAt: '2026-10-05T10:00:00-03:00', sentAt: '2026-10-05T10:00:00-03:00', respondedAt: '2026-10-05T18:00:00-03:00' });
    await createQuoteWith(user.id, joao.id, { amount: '700', status: 'REJECTED', createdAt: '2026-10-06T10:00:00-03:00', sentAt: '2026-10-06T10:00:00-03:00', respondedAt: '2026-10-07T10:00:00-03:00' });

    const summary = await getManagementSummary(user.id, { now: NOW, transaction });

    expect(summary.totalQuotes).toBe(6);
    expect(summary.statusCounts).toEqual({ DRAFT: 1, SENT: 2, ACCEPTED: 2, REJECTED: 1 });
    expect(summary.acceptanceRate).toBeCloseTo(0.6667, 4);
    expect(summary.acceptedAmount).toBe('1500.50');
    expect(summary.openAmount).toBe('500.00');
    expect(summary.averageResponseHours).toBe(12);
    expect(summary.awaitingResponse.map((item) => [item.clientName, item.daysWaiting])).toEqual([['Maria', 12], ['João', 5]]);
    expect(summary.awaitingResponse[1]).toMatchObject({ quoteId: recentSent.id, totalAmount: '200.00' });
    expect(summary.topClients).toEqual([
      { clientId: maria.id, clientName: 'Maria', acceptedCount: 1, acceptedAmount: '1000.00' },
      { clientId: joao.id, clientName: 'João', acceptedCount: 1, acceptedAmount: '500.50' },
    ]);
  });

  test('o período conta pela data de criação; pendentes antigos continuam na lista de espera', async () => {
    const user = await createProvider();
    const client = await createClient(user.id, 'Maria');

    await createQuoteWith(user.id, client.id, { amount: '100', status: 'ACCEPTED', createdAt: '2026-06-10T10:00:00-03:00' });
    await createQuoteWith(user.id, client.id, { amount: '250', status: 'SENT', createdAt: '2026-08-20T10:00:00-03:00', sentAt: '2026-08-20T10:00:00-03:00' });
    await createQuoteWith(user.id, client.id, { amount: '50', createdAt: '2025-12-31T23:30:00-03:00' });

    const month = await getManagementSummary(user.id, { period: 'month', now: NOW, transaction });
    const quarter = await getManagementSummary(user.id, { period: 'quarter', now: NOW, transaction });
    const year = await getManagementSummary(user.id, { period: 'year', now: NOW, transaction });
    const all = await getManagementSummary(user.id, { period: 'all', now: NOW, transaction });

    expect([month.totalQuotes, quarter.totalQuotes, year.totalQuotes, all.totalQuotes]).toEqual([0, 1, 2, 3]);
    expect(month.awaitingResponse).toHaveLength(1);
    expect(month.awaitingResponse[0].daysWaiting).toBe(56);
    expect(year.acceptedAmount).toBe('100.00');
    expect(month.acceptedAmount).toBe('0.00');
  });

  test('cada prestador vê somente os próprios números', async () => {
    const owner = await createProvider();
    const other = await createProvider();
    const client = await createClient(owner.id, 'Maria');

    await createQuoteWith(owner.id, client.id, { amount: '100', status: 'SENT', createdAt: '2026-10-02T10:00:00-03:00', sentAt: '2026-10-02T10:00:00-03:00' });

    const summary = await getManagementSummary(other.id, { now: NOW, transaction });

    expect(summary.totalQuotes).toBe(0);
    expect(summary.awaitingResponse).toEqual([]);
  });
});
