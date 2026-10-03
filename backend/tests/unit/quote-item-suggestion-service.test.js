import { jest } from '@jest/globals';

const create = jest.fn();
let anthropicClient;

jest.unstable_mockModule('../../src/services/anthropic.js', () => ({
  getAnthropicClient: () => anthropicClient,
}));

const { REVIEW_MODEL } = await import('../../src/services/quote-description-review.js');
const {
  ITEMS_SCHEMA,
  QuoteItemSuggestionError,
  buildItemSuggestionMessage,
  normalizeSuggestedItems,
  suggestQuoteItems,
} = await import('../../src/services/quote-item-suggestion.js');

const input = { description: ' Placa-mãe 870X, memória DDR5 16 GB (2 unidades), processador 7800X, fonte 800W. ' };

function buildResponse(items, overrides = {}) {
  return {
    model: REVIEW_MODEL,
    stop_reason: 'end_turn',
    usage: { input_tokens: 350, output_tokens: 90 },
    content: [{ type: 'text', text: JSON.stringify({ items }) }],
    ...overrides,
  };
}

describe('separação da descrição em itens com IA', () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    anthropicClient = { messages: { create } };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('envia somente a descrição, com saída JSON no formato dos itens', async () => {
    create.mockResolvedValue(buildResponse([{ description: 'Placa-mãe 870X', quantity: '1' }]));

    await suggestQuoteItems(input);

    const request = create.mock.calls[0][0];
    expect(request.model).toBe(REVIEW_MODEL);
    expect(request.output_config).toEqual({ format: { type: 'json_schema', schema: ITEMS_SCHEMA } });
    expect(request.messages).toEqual([{ role: 'user', content: buildItemSuggestionMessage(input) }]);
    expect(buildItemSuggestionMessage(input)).toBe('<descricao>\nPlaca-mãe 870X, memória DDR5 16 GB (2 unidades), processador 7800X, fonte 800W.\n</descricao>');
  });

  test('devolve os itens sugeridos e registra só os metadados de uso', async () => {
    create.mockResolvedValue(buildResponse([
      { description: 'Placa-mãe 870X', quantity: '1' },
      { description: 'Memória DDR5 16 GB', quantity: '2' },
    ]));

    await expect(suggestQuoteItems(input)).resolves.toEqual([
      { description: 'Placa-mãe 870X', quantity: '1' },
      { description: 'Memória DDR5 16 GB', quantity: '2' },
    ]);

    const log = JSON.parse(logSpy.mock.calls[0][0]);
    expect(log).toEqual(expect.objectContaining({ event: 'quote_item_suggestion', inputTokens: 350, outputTokens: 90 }));
    expect(logSpy.mock.calls[0][0]).not.toContain('Placa-mãe');
  });

  test('corrige quantidades inválidas para 1 e descarta itens vazios ou longos demais', () => {
    expect(normalizeSuggestedItems([
      { description: ' Fonte 800W ', quantity: '2,5' },
      { description: 'Gabinete', quantity: 'duas' },
      { description: 'Cooler', quantity: '0' },
      { description: '   ', quantity: '3' },
      { description: 'x'.repeat(501), quantity: '1' },
    ])).toEqual([
      { description: 'Fonte 800W', quantity: '2.5' },
      { description: 'Gabinete', quantity: '1' },
      { description: 'Cooler', quantity: '1' },
    ]);
    expect(normalizeSuggestedItems(null)).toEqual([]);
  });

  test.each([
    ['recusa', buildResponse([], { stop_reason: 'refusal', content: [] }), 'AI_REFUSED'],
    ['resposta cortada', buildResponse([{ description: 'Fonte', quantity: '1' }], { stop_reason: 'max_tokens' }), 'AI_INVALID_RESPONSE'],
    ['JSON inválido', buildResponse([], { content: [{ type: 'text', text: 'não é JSON' }] }), 'AI_INVALID_RESPONSE'],
    ['nenhum item', buildResponse([]), 'AI_INVALID_RESPONSE'],
  ])('trata %s como erro conhecido', async (_case, response, code) => {
    create.mockResolvedValue(response);

    await expect(suggestQuoteItems(input)).rejects.toEqual(new QuoteItemSuggestionError(code));
  });

  test('sem chave configurada, não chama a IA', async () => {
    anthropicClient = null;

    await expect(suggestQuoteItems(input)).rejects.toEqual(new QuoteItemSuggestionError('AI_NOT_CONFIGURED'));
    expect(create).not.toHaveBeenCalled();
  });
});
