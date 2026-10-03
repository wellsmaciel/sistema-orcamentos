import Anthropic from '@anthropic-ai/sdk';
import { QuoteItemSuggestionError, suggestQuoteItems as suggestQuoteItemsService } from '../services/quote-item-suggestion.js';
import { isQuoteDescriptionReviewAvailable } from '../services/quote-description-review.js';
import { aiUsageLimiter } from '../utils/ai-rate-limit.js';

const ERROR_RESPONSES = {
  AI_NOT_CONFIGURED: { status: 503, message: 'A separação em itens com IA não está disponível neste ambiente.' },
  AI_RATE_LIMITED: { status: 429, message: 'Você atingiu o limite de uso da IA. Tente novamente em alguns minutos.' },
  AI_REFUSED: { status: 422, message: 'A IA não pôde separar esta descrição em itens. Preencha os itens manualmente.' },
  AI_INVALID_RESPONSE: { status: 502, message: 'A IA não retornou itens válidos. Tente novamente ou preencha os itens manualmente.' },
  AI_UNAVAILABLE: { status: 503, message: 'O serviço de IA está indisponível no momento. Tente novamente em alguns minutos.' },
};

function sendSuggestionError(response, code) {
  const { status, message } = ERROR_RESPONSES[code];

  return response.status(status).json({ code, message });
}

async function suggestQuoteItems(request, response, next) {
  if (!isQuoteDescriptionReviewAvailable()) {
    return sendSuggestionError(response, 'AI_NOT_CONFIGURED');
  }

  if (!aiUsageLimiter.tryConsume(request.authenticatedUser.id)) {
    return sendSuggestionError(response, 'AI_RATE_LIMITED');
  }

  try {
    const items = await suggestQuoteItemsService(request.body);

    return response.status(200).json({ items });
  } catch (error) {
    if (error instanceof QuoteItemSuggestionError) {
      return sendSuggestionError(response, error.code);
    }

    if (error instanceof Anthropic.APIError) {
      console.error(`Falha ao consultar o serviço de IA: ${error.constructor.name} (status ${error.status ?? 'sem resposta'}).`);

      return sendSuggestionError(response, 'AI_UNAVAILABLE');
    }

    return next(error);
  }
}

export { suggestQuoteItems };
