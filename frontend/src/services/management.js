import { fetchJsonWithTimeout, withTimeout } from './request.js';

async function requestManagementSummary(getAccessTokenSilently, { period = 'month' } = {}) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const { response, responseBody } = await fetchJsonWithTimeout(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/management/summary?period=${encodeURIComponent(period)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar os indicadores.');
  }

  return responseBody;
}

export { requestManagementSummary };
