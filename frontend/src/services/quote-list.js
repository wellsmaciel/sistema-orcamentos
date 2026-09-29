async function requestQuotesPage(getAccessTokenSilently, { search = '', status = '', serviceDateFrom = '', serviceDateTo = '', page = 1 } = {}) {
  const accessToken = await getAccessTokenSilently();

  const parameters = new URLSearchParams({
    page: String(page),
  });

  for (const [name, value] of [
    ['search', search.trim()],
    ['status', status],
    ['serviceDateFrom', serviceDateFrom],
    ['serviceDateTo', serviceDateTo],
  ]) {
    if (value) {
      parameters.set(name, value);
    }
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes/search?${parameters.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = await response.json();

  if (!response.ok) {
    const detailsMessage = responseBody.details?.map((detail) => detail.message).join(' ');

    throw new Error(detailsMessage || responseBody.message || 'Não foi possível consultar os orçamentos.');
  }

  return responseBody;
}

export { requestQuotesPage };
