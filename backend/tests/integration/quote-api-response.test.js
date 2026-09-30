import { jest } from '@jest/globals';
import request from 'supertest';

const USER_ID = '550e8400-e29b-41d4-a716-446655440003';
const QUOTE_ID = '550e8400-e29b-41d4-a716-446655440000';
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001';
const ITEM_ID = '550e8400-e29b-41d4-a716-446655440002';
const PUBLIC_TOKEN = 'a'.repeat(64);

const services = Object.fromEntries(
  ['createQuote', 'listQuotes', 'listQuotesPage', 'updateQuote', 'confirmQuote', 'getPublicQuote', 'respondToPublicQuote', 'createQuoteCorrection', 'getQuoteHistory'].map((name) => [name, jest.fn()]),
);

// Testa rotas, validadores e JSON reais; autenticação e persistência são simuladas
// apenas nesta suíte. As suítes de autorização e banco continuam independentes.
jest.unstable_mockModule('../../src/services/quote.js', () => services);
jest.unstable_mockModule('../../src/middlewares/auth.js', () => ({
  validateAccessToken: (_request, _response, next) => next(),
}));
jest.unstable_mockModule('../../src/middlewares/authenticated-user.js', () => ({
  loadAuthenticatedUser: (request, _response, next) => {
    request.authenticatedUser = { id: USER_ID };
    return next();
  },
}));

const { default: app } = await import('../../src/app.js');

function buildQuote(pricingMode = 'ITEMIZED') {
  return {
    id: QUOTE_ID,
    quoteNumber: 123,
    userId: USER_ID,
    auth0Subject: 'auth0|private-identity',
    clientId: CLIENT_ID,
    clientName: 'Cliente de Teste',
    clientEmail: 'cliente@example.com',
    clientPhone: '11999999999',
    description: 'Descrição geral do serviço.',
    pricingMode,
    totalAmount: pricingMode === 'ITEMIZED' ? '49.98' : '1000.00',
    serviceDate: '2099-10-15',
    serviceStreet: 'Rua do Serviço',
    serviceNumber: '100',
    servicePostalCode: '01001-000',
    serviceDistrict: 'Centro',
    serviceCity: 'São Paulo',
    serviceState: 'SP',
    status: 'SENT',
    publicToken: PUBLIC_TOKEN,
    sentAt: new Date('2026-09-29T10:00:00Z'),
    created_at: new Date('2026-09-29T09:00:00Z'),
    items: [{
      id: ITEM_ID,
      quoteId: QUOTE_ID,
      description: 'Cabo elétrico',
      quantity: '2.500',
      unitPrice: pricingMode === 'ITEMIZED' ? '19.99' : null,
      position: 1,
      created_at: new Date('2026-09-29T09:00:00Z'),
      updated_at: new Date('2026-09-29T09:00:00Z'),
    }],
  };
}

function buildInput(pricingMode = 'ITEMIZED') {
  const quote = buildQuote(pricingMode);
  const input = {
    clientId: CLIENT_ID,
    description: quote.description,
    pricingMode,
    items: [{ description: 'Cabo elétrico', quantity: '2.5' }],
    serviceDate: quote.serviceDate,
    serviceAddress: {
      street: quote.serviceStreet,
      number: quote.serviceNumber,
      postalCode: quote.servicePostalCode,
      district: quote.serviceDistrict,
      city: quote.serviceCity,
      state: quote.serviceState,
    },
  };

  if (pricingMode === 'ITEMIZED') {
    input.items[0].unitPrice = '19.99';
  } else {
    input.totalAmount = '1000.00';
  }

  return input;
}

function expectItems(body, pricingMode = 'ITEMIZED') {
  expect(body.pricingMode).toBe(pricingMode);
  expect(body.items).toEqual([{
    id: ITEM_ID,
    description: 'Cabo elétrico',
    quantity: '2.5',
    unitPrice: pricingMode === 'ITEMIZED' ? '19.99' : null,
    subtotal: pricingMode === 'ITEMIZED' ? '49.98' : null,
    position: 1,
  }]);
}

describe('Contrato JSON de orçamento e itens', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test.each(['ITEMIZED', 'FIXED_TOTAL'])('POST deve rejeitar quantidade com duas casas no modo %s', async (pricingMode) => {
    const input = buildInput(pricingMode);
    input.items[0].quantity = '2.55';

    const response = await request(app).post('/api/v1/quotes').send(input);

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'items[0].quantity' })]));
    expect(services.createQuote).not.toHaveBeenCalled();
  });

  test.each(['ITEMIZED', 'FIXED_TOTAL'])('PUT deve rejeitar quantidade com duas casas no modo %s', async (pricingMode) => {
    const input = buildInput(pricingMode);
    delete input.clientId;
    input.items[0].quantity = '2.55';

    const response = await request(app).put(`/api/v1/quotes/${QUOTE_ID}`).send(input);

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'items[0].quantity' })]));
    expect(services.updateQuote).not.toHaveBeenCalled();
  });

  test.each(['ITEMIZED', 'FIXED_TOTAL'])('POST deve devolver os itens no modo %s', async (pricingMode) => {
    const input = buildInput(pricingMode);
    services.createQuote.mockResolvedValue({ ...buildQuote(pricingMode), status: 'DRAFT', publicToken: null, sentAt: null });

    const response = await request(app).post('/api/v1/quotes').send(input);

    expect(response.status).toBe(201);
    expectItems(response.body, pricingMode);
    expect(response.body.totalAmount).toBe(pricingMode === 'ITEMIZED' ? '49.98' : '1000.00');
    expect(services.createQuote).toHaveBeenCalledWith(USER_ID, input);
  });

  test('GET deve incluir itens na listagem privada', async () => {
    services.listQuotes.mockResolvedValue([buildQuote()]);

    const response = await request(app).get('/api/v1/quotes');

    expect(response.status).toBe(200);
    expectItems(response.body.items[0]);
    expect(services.listQuotes).toHaveBeenCalledWith(USER_ID);
  });

  test('GET search deve incluir itens e preservar os metadados da página', async () => {
    services.listQuotesPage.mockResolvedValue({ items: [buildQuote()], relatedQuotes: [], total: 1, page: 1, pageSize: 20, totalPages: 1 });

    const response = await request(app).get('/api/v1/quotes/search').query({ page: '1' });

    expect(response.status).toBe(200);
    expectItems(response.body.items[0]);
    expect(response.body).toEqual(expect.objectContaining({ total: 1, page: 1, pageSize: 20, totalPages: 1 }));
  });

  test('PUT deve incluir itens após a edição', async () => {
    const input = buildInput();
    delete input.clientId;
    services.updateQuote.mockResolvedValue({ outcome: 'UPDATED', quote: buildQuote() });

    const response = await request(app).put(`/api/v1/quotes/${QUOTE_ID}`).send(input);

    expect(response.status).toBe(200);
    expectItems(response.body);
    expect(services.updateQuote).toHaveBeenCalledWith(USER_ID, QUOTE_ID, input);
  });

  test('POST confirm deve incluir itens após a confirmação', async () => {
    services.confirmQuote.mockResolvedValue({ outcome: 'CONFIRMED', quote: buildQuote() });

    const response = await request(app).post(`/api/v1/quotes/${QUOTE_ID}/confirm`);

    expect(response.status).toBe(200);
    expectItems(response.body);
    expect(services.confirmQuote).toHaveBeenCalledWith(USER_ID, QUOTE_ID);
  });

  test('POST corrections deve incluir os itens copiados', async () => {
    services.createQuoteCorrection.mockResolvedValue({ outcome: 'CORRECTION_CREATED', quote: { ...buildQuote(), status: 'DRAFT', publicToken: null, sentAt: null, correctedFromId: CLIENT_ID } });

    const response = await request(app).post(`/api/v1/quotes/${QUOTE_ID}/corrections`);

    expect(response.status).toBe(201);
    expectItems(response.body);
    expect(response.body.correctedFromId).toBe(CLIENT_ID);
  });

  test.each(['ITEMIZED', 'FIXED_TOTAL'])('GET público deve incluir itens de %s sem expor campos internos', async (pricingMode) => {
    services.getPublicQuote.mockResolvedValue(buildQuote(pricingMode));

    const response = await request(app).get(`/api/v1/public/quotes/${PUBLIC_TOKEN}`);

    expect(response.status).toBe(200);
    expectItems(response.body, pricingMode);
    for (const field of ['id', 'userId', 'auth0Subject', 'clientId', 'clientEmail', 'clientPhone', 'publicToken', 'created_at']) {
      expect(response.body).not.toHaveProperty(field);
    }
    expect(services.getPublicQuote).toHaveBeenCalledWith(PUBLIC_TOKEN);
  });

  test.each(['ACCEPTED', 'REJECTED'])('POST público deve preservar os itens após %s', async (decision) => {
    services.respondToPublicQuote.mockResolvedValue({ outcome: 'RESPONDED', quote: { ...buildQuote(), status: decision, respondedAt: new Date() } });

    const response = await request(app).post(`/api/v1/public/quotes/${PUBLIC_TOKEN}/respond`).send({ decision });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(decision);
    expectItems(response.body);
  });

  test.each([
    ['confirm', 'confirmQuote'],
    ['corrections', 'createQuoteCorrection'],
  ])('POST %s deve tratar itens inválidos como conflito', async (route, service) => {
    const details = [{ field: 'items', message: 'Informe pelo menos um item.' }];
    services[service].mockResolvedValue({ outcome: 'INVALID_ITEMS', details });

    const response = await request(app).post(`/api/v1/quotes/${QUOTE_ID}/${route}`);

    expect(response.status).toBe(409);
    expect(response.body).toEqual(expect.objectContaining({ code: 'QUOTE_ITEMS_INVALID', details }));
  });

  test('GET histórico retorna eventos sem campos internos e trata orçamento inexistente', async () => {
    services.getQuoteHistory.mockResolvedValueOnce([{
      id: ITEM_ID,
      eventType: 'REJECTED',
      actorType: 'CLIENT',
      details: { rejectionReason: 'Prazo inadequado.' },
      created_at: new Date('2026-09-30T12:00:00Z'),
    }]);

    const response = await request(app).get(`/api/v1/quotes/${QUOTE_ID}/history`);
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([{
      id: ITEM_ID,
      type: 'REJECTED',
      actor: 'CLIENT',
      details: { rejectionReason: 'Prazo inadequado.' },
      createdAt: '2026-09-30T12:00:00.000Z',
    }]);
    expect(services.getQuoteHistory).toHaveBeenCalledWith(USER_ID, QUOTE_ID);

    services.getQuoteHistory.mockResolvedValueOnce(null);
    const missingResponse = await request(app).get(`/api/v1/quotes/${QUOTE_ID}/history`);
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body.code).toBe('QUOTE_NOT_FOUND');
  });
});
