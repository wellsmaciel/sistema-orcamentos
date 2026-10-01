import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import Company from '../../src/models/company.js';
import User from '../../src/models/user.js';
import { confirmQuote, createQuote, respondToPublicQuote } from '../../src/services/quote.js';
import { listResponseNotifications, markResponseNotificationsRead } from '../../src/services/response-notification.js';

describe('Avisos de resposta dos clientes', () => {
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

  async function createProvider({ seenAt = null } = {}) {
    const user = await User.create(
      {
        auth0Subject: `auth0|notification-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: `${randomUUID()}@example.com`,
        emailVerified: true,
        responseNotificationsSeenAt: seenAt,
      },
      { transaction },
    );

    await Company.create(
      { ownerUserId: user.id, name: 'Oficina de Teste', email: 'oficina@example.com', phone: '1133334444' },
      { transaction },
    );

    const client = await Client.create(
      {
        userId: user.id, name: 'Maria Cliente', email: 'maria@example.com', phone: '11999999999',
        street: 'Rua do Cliente', number: '100', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP',
      },
      { transaction },
    );

    return { user, client };
  }

  async function createSentQuote(userId, clientId) {
    const quote = await createQuote(
      userId,
      {
        clientId,
        description: 'Troca de escapamento',
        pricingMode: 'FIXED_TOTAL',
        items: [{ description: 'Escapamento', quantity: '1' }],
        totalAmount: '750',
        serviceDate: '2099-10-15',
        serviceAddress: { street: 'Rua do Serviço', number: '10', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP' },
      },
      { transaction },
    );
    const { quote: sentQuote } = await confirmQuote(userId, quote.id, { transaction });

    return sentQuote;
  }

  function respond(quote, decision, reason) {
    return respondToPublicQuote(quote.publicToken, reason ? { decision, reason } : { decision }, { transaction });
  }

  test('lista as respostas mais recentes com decisão e motivo da recusa', async () => {
    const { user, client } = await createProvider();
    const accepted = await createSentQuote(user.id, client.id);
    const rejected = await createSentQuote(user.id, client.id);
    await createSentQuote(user.id, client.id);

    await respond(accepted, 'ACCEPTED');
    await respond(rejected, 'REJECTED', 'Valor acima do orçamento');

    const result = await listResponseNotifications(user.id, { transaction });

    expect(result.unreadCount).toBe(2);
    expect(result.items).toEqual([
      expect.objectContaining({ quoteId: rejected.id, clientName: 'Maria Cliente', decision: 'REJECTED', rejectionReason: 'Valor acima do orçamento', unread: true }),
      expect.objectContaining({ quoteId: accepted.id, decision: 'ACCEPTED', rejectionReason: null, unread: true }),
    ]);
  });

  test('marcar como vistas zera as novas, e uma resposta posterior volta a ser nova', async () => {
    const { user, client } = await createProvider();
    const first = await createSentQuote(user.id, client.id);
    const second = await createSentQuote(user.id, client.id);

    await respond(first, 'ACCEPTED');
    await markResponseNotificationsRead(user.id, { transaction });

    let result = await listResponseNotifications(user.id, { transaction });
    expect(result.unreadCount).toBe(0);
    expect(result.items.map((item) => item.unread)).toEqual([false]);

    await respond(second, 'REJECTED');

    result = await listResponseNotifications(user.id, { transaction });
    expect(result.unreadCount).toBe(1);
    expect(result.items.map((item) => [item.quoteId, item.unread])).toEqual([[second.id, true], [first.id, false]]);
  });

  test('respostas anteriores à data de visualização não aparecem como novas', async () => {
    const { user, client } = await createProvider();
    const quote = await createSentQuote(user.id, client.id);
    await respond(quote, 'ACCEPTED');

    await user.update({ responseNotificationsSeenAt: new Date(Date.now() + 60000) }, { transaction });

    const result = await listResponseNotifications(user.id, { transaction });
    expect(result.unreadCount).toBe(0);
    expect(result.items[0].unread).toBe(false);
  });

  test('cada prestador vê somente as respostas dos próprios orçamentos', async () => {
    const owner = await createProvider();
    const other = await createProvider();
    const quote = await createSentQuote(owner.user.id, owner.client.id);
    await respond(quote, 'ACCEPTED');

    const otherResult = await listResponseNotifications(other.user.id, { transaction });
    await markResponseNotificationsRead(other.user.id, { transaction });
    const ownerResult = await listResponseNotifications(owner.user.id, { transaction });

    expect(otherResult).toEqual({ unreadCount: 0, items: [] });
    expect(ownerResult.unreadCount).toBe(1);
  });

  test('limita a quantidade de itens exibidos, mas conta todas as novas', async () => {
    const { user, client } = await createProvider();

    for (let index = 0; index < 3; index += 1) {
      await respond(await createSentQuote(user.id, client.id), 'ACCEPTED');
    }

    const result = await listResponseNotifications(user.id, { limit: 2, transaction });
    expect(result.items).toHaveLength(2);
    expect(result.unreadCount).toBe(3);
  });
});
