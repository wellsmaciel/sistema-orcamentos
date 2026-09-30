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

const ENDPOINT = '/api/v1/quotes/description-review';

const reviewInput = {
  description: 'instalar 4 camera no predio',
  items: [{ description: 'Câmera', quantity: '4' }],
};

function buildResponse(overrides = {}) {
  return {
    model: 'claude-haiku-4-5',
    stop_reason: 'end_turn',
    usage: { input_tokens: 400, output_tokens: 120 },
    content: [{ type: 'text', text: 'Instalação de quatro câmeras no prédio.' }],
    ...overrides,
  };
}

describe('POST /api/v1/quotes/description-review', () => {
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

  test('devolve a sugestão revisada pela IA', async () => {
    create.mockResolvedValue(buildResponse());

    const response = await request(app).post(ENDPOINT).set('x-test-user', 'user-success').send(reviewInput);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ suggestion: 'Instalação de quatro câmeras no prédio.' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].messages[0].content).toContain('instalar 4 camera no predio');
  });

  test('rejeita dados do cliente sem chamar a IA', async () => {
    const response = await request(app)
      .post(ENDPOINT)
      .set('x-test-user', 'user-validation')
      .send({ ...reviewInput, clientName: 'Maria' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details: [{ field: 'clientName', message: 'Este campo não é permitido.' }],
    });
    expect(create).not.toHaveBeenCalled();
  });

  test('responde 503 quando a chave da IA não está configurada', async () => {
    anthropicClient = null;

    const response = await request(app).post(ENDPOINT).set('x-test-user', 'user-not-configured').send(reviewInput);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'AI_NOT_CONFIGURED',
      message: 'A revisão com IA não está disponível neste ambiente.',
    });
  });

  test('responde 422 quando o modelo recusa o texto', async () => {
    create.mockResolvedValue(buildResponse({ stop_reason: 'refusal', content: [] }));

    const response = await request(app).post(ENDPOINT).set('x-test-user', 'user-refusal').send(reviewInput);

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('AI_REFUSED');
  });

  test('responde 503 quando o serviço de IA falha, sem expor detalhes', async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());

    const response = await request(app).post(ENDPOINT).set('x-test-user', 'user-timeout').send(reviewInput);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'AI_UNAVAILABLE',
      message: 'O serviço de IA está indisponível no momento. Tente novamente em alguns minutos.',
    });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('APIConnectionTimeoutError'));
  });

  test('limita a quantidade de revisões por prestador', async () => {
    create.mockResolvedValue(buildResponse());

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post(ENDPOINT).set('x-test-user', 'user-limit').send(reviewInput);
      expect(response.status).toBe(200);
    }

    const limitedResponse = await request(app).post(ENDPOINT).set('x-test-user', 'user-limit').send(reviewInput);

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.code).toBe('AI_RATE_LIMITED');
    expect(create).toHaveBeenCalledTimes(10);

    const otherUserResponse = await request(app).post(ENDPOINT).set('x-test-user', 'user-other').send(reviewInput);
    expect(otherUserResponse.status).toBe(200);
  });
});
