import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import User from '../../src/models/user.js';
import Client from '../../src/models/client.js';
import Quote from '../../src/models/quote.js';
import QuoteItem from '../../src/models/quote-item.js';

describe('Modelo QuoteItem', () => {
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

  async function createQuoteFixture(pricingMode = 'ITEMIZED') {
    const user = await User.create(
      {
        auth0Subject: `auth0|quote-item-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: 'prestador@example.com',
        emailVerified: true,
      },
      { transaction },
    );

    const client = await Client.create(
      {
        userId: user.id,
        name: 'Cliente de Teste',
        email: 'cliente@example.com',
        phone: '11999999999',
        street: 'Rua de Teste',
        number: '100',
        postalCode: '01001-000',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      },
      { transaction },
    );

    return Quote.create(
      {
        userId: user.id,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        description: 'Descrição geral do serviço.',
        pricingMode,
        totalAmount: pricingMode === 'ITEMIZED' ? '49.98' : '1000.00',
        serviceDate: '2026-10-15',
        serviceStreet: client.street,
        serviceNumber: client.number,
        servicePostalCode: client.postalCode,
        serviceDistrict: client.district,
        serviceCity: client.city,
        serviceState: client.state,
      },
      { transaction },
    );
  }

  function buildItemInput(quoteId, overrides = {}) {
    return {
      quoteId,
      description: 'Cabo elétrico',
      quantity: '2.500',
      unitPrice: '19.99',
      position: 1,
      ...overrides,
    };
  }

  test('deve persistir um item com quantidade fracionada e preço', async () => {
    const quote = await createQuoteFixture();

    const item = await QuoteItem.create(buildItemInput(quote.id), { transaction });

    expect(item.id).toBeDefined();
    expect(item.quoteId).toBe(quote.id);
    expect(item.description).toBe('Cabo elétrico');
    expect(item.quantity).toBe('2.500');
    expect(item.unitPrice).toBe('19.99');
    expect(item.position).toBe(1);
  });

  test('deve persistir um item sem preço individual no modo global', async () => {
    const quote = await createQuoteFixture('FIXED_TOTAL');

    const item = await QuoteItem.create(
      buildItemInput(quote.id, {
        description: 'Pastilhas de freio',
        quantity: '4.000',
        unitPrice: null,
      }),
      { transaction },
    );

    expect(quote.pricingMode).toBe('FIXED_TOTAL');
    expect(item.quantity).toBe('4.000');
    expect(item.unitPrice).toBeNull();
  });

  test('não deve permitir posições repetidas no mesmo orçamento', async () => {
    const quote = await createQuoteFixture();

    await QuoteItem.create(buildItemInput(quote.id), { transaction });

    await expect(
      QuoteItem.create(
        buildItemInput(quote.id, {
          description: 'Outro item',
        }),
        { transaction },
      ),
    ).rejects.toMatchObject({
      name: 'SequelizeUniqueConstraintError',
    });
  });

  test('não deve vincular um item a orçamento inexistente', async () => {
    await expect(QuoteItem.create(buildItemInput(randomUUID()), { transaction })).rejects.toMatchObject({
      name: 'SequelizeForeignKeyConstraintError',
    });
  });

  test.each([
    {
      label: 'quantidade zero',
      overrides: { quantity: '0.000' },
      constraint: 'quote_items_quantity_positive_check',
    },
    {
      label: 'preço individual zero',
      overrides: { unitPrice: '0.00' },
      constraint: 'quote_items_unit_price_positive_check',
    },
    {
      label: 'descrição vazia',
      overrides: { description: '   ' },
      constraint: 'quote_items_description_not_empty_check',
    },
    {
      label: 'posição zero',
      overrides: { position: 0 },
      constraint: 'quote_items_position_positive_check',
    },
  ])('o banco deve rejeitar $label', async ({ overrides, constraint }) => {
    const quote = await createQuoteFixture();

    await expect(
      QuoteItem.create(buildItemInput(quote.id, overrides), {
        transaction,
        validate: false,
      }),
    ).rejects.toMatchObject({
      original: {
        code: '23514',
        constraint,
      },
    });
  });
});
