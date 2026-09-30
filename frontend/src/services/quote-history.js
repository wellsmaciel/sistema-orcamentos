import { fetchJsonWithTimeout, withTimeout } from './request.js';

async function requestQuoteHistory(getAccessTokenSilently, quoteId) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const { response, responseBody } = await fetchJsonWithTimeout(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes/${quoteId}/history`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar o histórico do orçamento.');
  }

  return responseBody.items;
}

export { requestQuoteHistory };
