import { fetchJsonWithTimeout, withTimeout } from './request.js';

async function requestUpcomingServices(getAccessTokenSilently) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const { response, responseBody } = await fetchJsonWithTimeout(`${import.meta.env.VITE_API_BASE_URL}/api/v1/agenda`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar os próximos serviços.');
  }

  return responseBody;
}

export { requestUpcomingServices };
