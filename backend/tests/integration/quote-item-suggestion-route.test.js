import { jest } from '@jest/globals';
import Anthropic from '@anthropic-ai/sdk';
import request from 'supertest';

const create = jest.fn();
let anthropicClient;

jest.unstable_mockModule('../../src/middlewares/auth.js', () => ({
  validateAccessToken: (_request, _response, next) => next(),
}));

jest.unstable_mockModule('../../src/middlewares/authenticated-user.js', () => ({
  loadAuthenticatedUser: (request, _response, next) => {
    request.authenticatedUser = { id: request.get('x-test-user') ?? 'user-1' };
    next();
  },
}));

jest.unstable_mockModule('../../src/services/anthropic.js', () => ({
  getAnthropicClient: () => anthropicClient,
}));

const { default: app } = await import('../../src/app.js');

const ITEMS_ENDPOINT = '/api/v1/quotes/item-suggestions';
const REVIEW_ENDPOINT = '/api/v1/quotes/description-review';
const input = { description: 'Placa-mãe 870X, memória DDR5 16 GB (2 unidades)' };
const suggestedItems = [
  { description: 'Placa-mãe 870X', quantity: '1' },
  { description: 'Memória DDR5 16 GB', quantity: '2' },
];

function buildItemsResponse(overrides = {}) {
  return {
    model: 'claude-haiku-4-5',
    stop_reason: 'end_turn',
    usage: { input_tokens: 300, output_tokens: 80 },
    content: [{ type: 'text', text: JSON.stringify({ items: suggestedItems }) }],
    ...overrides,
  };
}

describe('POST /api/v1/quotes/item-suggestions', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    anthropicClient = { messages: { create } };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('devolve os itens sugeridos pela IA', async () => {
    create.mockResolvedValue(buildItemsResponse());

    const response = await request(app).post(ITEMS_ENDPOINT).set('x-test-user', 'items-success').send(input);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: suggestedItems });
  });

  test('aceita somente a descrição, sem chamar a IA para outros campos', async () => {
    const response = await request(app)
      .post(ITEMS_ENDPOINT)
      .set('x-test-user', 'items-validation')
      .send({ ...input, clientName: 'Maria' });

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([{ field: 'clientName', message: 'Este campo não é permitido.' }]);
    expect(create).not.toHaveBeenCalled();
  });

  test('exige a descrição', async () => {
    const response = await request(app).post(ITEMS_ENDPOINT).set('x-test-user', 'items-empty').send({ description: '  ' });

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([{ field: 'description', message: 'Este campo é obrigatório.' }]);
  });

  test('responde 503 sem chave da IA e 422 quando o modelo recusa', async () => {
    anthropicClient = null;
    const notConfigured = await request(app).post(ITEMS_ENDPOINT).set('x-test-user', 'items-not-configured').send(input);
    expect(notConfigured.status).toBe(503);
    expect(notConfigured.body.code).toBe('AI_NOT_CONFIGURED');

    anthropicClient = { messages: { create } };
    create.mockResolvedValue(buildItemsResponse({ stop_reason: 'refusal', content: [] }));
    const refused = await request(app).post(ITEMS_ENDPOINT).set('x-test-user', 'items-refusal').send(input);
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('AI_REFUSED');
  });

  test('responde 503 quando o serviço de IA falha, sem expor detalhes', async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());

    const response = await request(app).post(ITEMS_ENDPOINT).set('x-test-user', 'items-timeout').send(input);

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('AI_UNAVAILABLE');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('APIConnectionTimeoutError'));
  });

  test('o limite de uso da IA é o mesmo para a revisão e a separação em itens', async () => {
    create.mockImplementation(async (body) => (body.output_config
      ? buildItemsResponse()
      : { ...buildItemsResponse(), content: [{ type: 'text', text: 'Descrição revisada.' }] }));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await request(app).post(REVIEW_ENDPOINT).set('x-test-user', 'items-shared-limit').send(input)).status).toBe(200);
      expect((await request(app).post(ITEMS_ENDPOINT).set('x-test-user', 'items-shared-limit').send(input)).status).toBe(200);
    }

    const limited = await request(app).post(ITEMS_ENDPOINT).set('x-test-user', 'items-shared-limit').send(input);

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('AI_RATE_LIMITED');
    expect(create).toHaveBeenCalledTimes(10);
  });
});
