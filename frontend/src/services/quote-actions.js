import { describeApiError } from '../utils/validation-message.js';
import { requestApi } from './request.js';

async function requestQuoteAction(getAccessTokenSilently, path, options, fallbackMessage) {
  const { response, responseBody } = await requestApi(getAccessTokenSilently, path, options);

  if (!response.ok) {
    throw new Error(describeApiError(responseBody, fallbackMessage));
  }

  return responseBody;
}

// Cria um rascunho novo ou altera um rascunho existente.
function saveQuote(getAccessTokenSilently, requestBody, quoteId = null) {
  return requestQuoteAction(
    getAccessTokenSilently,
    quoteId ? `/api/v1/quotes/${quoteId}` : '/api/v1/quotes',
    { method: quoteId ? 'PUT' : 'POST', body: requestBody },
    `Não foi possível ${quoteId ? 'alterar' : 'criar'} o orçamento.`,
  );
}

function confirmQuote(getAccessTokenSilently, quoteId) {
  return requestQuoteAction(getAccessTokenSilently, `/api/v1/quotes/${quoteId}/confirm`, { method: 'POST' }, 'Não foi possível confirmar o orçamento.');
}

function createQuoteCorrection(getAccessTokenSilently, quoteId) {
  return requestQuoteAction(getAccessTokenSilently, `/api/v1/quotes/${quoteId}/corrections`, { method: 'POST' }, 'Não foi possível criar a correção.');
}

export { confirmQuote, createQuoteCorrection, saveQuote };
