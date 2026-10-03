import { fetchJsonWithTimeout } from './request.js';

// Páginas do cliente: não usam login, o token do link identifica o orçamento.
async function requestPublicQuote(publicToken) {
  const { response, responseBody } = await fetchJsonWithTimeout(`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/quotes/${publicToken}`);

  if (!response.ok) {
    throw new Error(responseBody?.message ?? 'Não foi possível consultar o orçamento.');
  }

  return responseBody;
}

async function respondToPublicQuote(publicToken, decision, reason) {
  const requestBody = { decision };

  if (decision === 'REJECTED') {
    requestBody.reason = reason;
  }

  const { response, responseBody } = await fetchJsonWithTimeout(`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/quotes/${publicToken}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(responseBody?.message ?? 'Não foi possível registrar a resposta.');
  }

  return responseBody;
}

export { requestPublicQuote, respondToPublicQuote };
