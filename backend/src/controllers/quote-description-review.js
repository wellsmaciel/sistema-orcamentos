import Anthropic from '@anthropic-ai/sdk';
import {
  QuoteDescriptionReviewError,
  isQuoteDescriptionReviewAvailable,
  reviewQuoteDescription as reviewQuoteDescriptionService,
} from '../services/quote-description-review.js';
import { aiUsageLimiter } from '../utils/ai-rate-limit.js';

const ERROR_RESPONSES = {
  AI_NOT_CONFIGURED: { status: 503, message: 'A revisão com IA não está disponível neste ambiente.' },
  AI_RATE_LIMITED: { status: 429, message: 'Você atingiu o limite de revisões com IA. Tente novamente em alguns minutos.' },
  AI_REFUSED: { status: 422, message: 'A IA não pôde revisar este texto. Ajuste a descrição manualmente.' },
  AI_INVALID_RESPONSE: { status: 502, message: 'A IA não retornou uma sugestão válida. Tente novamente.' },
  AI_UNAVAILABLE: { status: 503, message: 'O serviço de IA está indisponível no momento. Tente novamente em alguns minutos.' },
};

function sendReviewError(response, code) {
  const { status, message } = ERROR_RESPONSES[code];

  return response.status(status).json({ code, message });
}

async function reviewQuoteDescription(request, response, next) {
  if (!isQuoteDescriptionReviewAvailable()) {
    return sendReviewError(response, 'AI_NOT_CONFIGURED');
  }

  if (!aiUsageLimiter.tryConsume(request.authenticatedUser.id)) {
    return sendReviewError(response, 'AI_RATE_LIMITED');
  }

  try {
    const suggestion = await reviewQuoteDescriptionService(request.body);

    return response.status(200).json({ suggestion });
  } catch (error) {
    if (error instanceof QuoteDescriptionReviewError) {
      return sendReviewError(response, error.code);
    }

    if (error instanceof Anthropic.APIError) {
      console.error(`Falha ao consultar o serviço de IA: ${error.constructor.name} (status ${error.status ?? 'sem resposta'}).`);

      return sendReviewError(response, 'AI_UNAVAILABLE');
    }

    return next(error);
  }
}

export { reviewQuoteDescription };
