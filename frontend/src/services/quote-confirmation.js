async function requestQuoteConfirmation(getAccessTokenSilently, quoteId) {
  const accessToken = await getAccessTokenSilently();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes/${quoteId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível confirmar o orçamento.');
  }

  return responseBody;
}

export { requestQuoteConfirmation };
