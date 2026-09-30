import { jest } from '@jest/globals';

const create = jest.fn();
let anthropicClient;

jest.unstable_mockModule('../../src/services/anthropic.js', () => ({
  getAnthropicClient: () => anthropicClient,
}));

const {
  REVIEW_MODEL,
  buildReviewMessage,
  isQuoteDescriptionReviewAvailable,
  reviewQuoteDescription,
} = await import('../../src/services/quote-description-review.js');

const input = {
  description: ' instalar 4 camera no predio ',
  items: [{ description: 'Câmera', quantity: '4' }, { description: 'Gravador digital' }],
};

function buildResponse(overrides = {}) {
  return {
    model: REVIEW_MODEL,
    stop_reason: 'end_turn',
    usage: { input_tokens: 420, output_tokens: 180 },
    content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: '  Instalação de quatro câmeras no prédio.  ' },
    ],
    ...overrides,
  };
}

describe('revisão da descrição com IA', () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    anthropicClient = { messages: { create } };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('monta a mensagem somente com a descrição e os itens', () => {
    expect(buildReviewMessage(input)).toBe([
      '<descricao>',
      'instalar 4 camera no predio',
      '</descricao>',
      '<itens>',
      '- Câmera (quantidade: 4)',
      '- Gravador digital',
      '</itens>',
    ].join('\n'));
    expect(buildReviewMessage({ description: 'Troca de disjuntor' })).toContain('(nenhum item informado)');
  });

  test('envia o pedido com o modelo configurado e devolve o texto revisado', async () => {
    create.mockResolvedValue(buildResponse());

    await expect(reviewQuoteDescription(input)).resolves.toBe('Instalação de quatro câmeras no prédio.');

    expect(create).toHaveBeenCalledTimes(1);
    const [params] = create.mock.calls[0];
    expect(params).toMatchObject({ model: 'claude-haiku-4-5', max_tokens: 4096 });
    expect(params).not.toHaveProperty('output_config');
    expect(params.system).toContain('não acrescente serviços, materiais, prazos, garantias');
    expect(params.system).toContain('preserve exatamente quantidades e abrangência');
    expect(params.system).toContain('sem omitir nenhuma informação da descrição');
    expect(params.system).toContain('não escolha a ação do serviço pelo prestador');
    expect(params.messages).toEqual([{ role: 'user', content: buildReviewMessage(input) }]);
  });

  test('registra o uso de tokens sem registrar o texto do prestador', async () => {
    create.mockResolvedValue(buildResponse());

    await reviewQuoteDescription(input);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logEntry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(logEntry).toMatchObject({ event: 'quote_description_review', inputTokens: 420, outputTokens: 180 });
    expect(logSpy.mock.calls[0][0]).not.toContain('camera');
  });

  test('informa recusa do modelo', async () => {
    create.mockResolvedValue(buildResponse({ stop_reason: 'refusal', content: [] }));

    await expect(reviewQuoteDescription(input)).rejects.toMatchObject({ code: 'AI_REFUSED' });
  });

  test('descarta resposta interrompida pelo limite de tokens ou sem texto', async () => {
    create.mockResolvedValueOnce(buildResponse({ stop_reason: 'max_tokens' }));
    await expect(reviewQuoteDescription(input)).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });

    create.mockResolvedValueOnce(buildResponse({ content: [{ type: 'text', text: '   ' }] }));
    await expect(reviewQuoteDescription(input)).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
  });

  test('fica indisponível sem chave configurada', async () => {
    anthropicClient = null;

    expect(isQuoteDescriptionReviewAvailable()).toBe(false);
    await expect(reviewQuoteDescription(input)).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
    expect(create).not.toHaveBeenCalled();
  });
});
