import { fetchJsonWithTimeout, withTimeout } from './request.js';

// A resposta da IA pode levar mais tempo que as consultas comuns.
const REVIEW_TIMEOUT_MS = 45000;

async function requestQuoteDescriptionReview(getAccessTokenSilently, reviewRequest) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const { response, responseBody } = await fetchJsonWithTimeout(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes/description-review`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewRequest),
    },
    REVIEW_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível revisar a descrição com IA.');
  }

  return responseBody.suggestion;
}

export { requestQuoteDescriptionReview };
