import { fetchJsonWithTimeout, withTimeout } from './request.js';

async function requestActivitiesPage(getAccessTokenSilently, { page = 1 } = {}) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const { response, responseBody } = await fetchJsonWithTimeout(
    `${import.meta.env.VITE_API_BASE_URL}/api/v1/activities?page=${page}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar as atividades.');
  }

  return responseBody;
}

export { requestActivitiesPage };
