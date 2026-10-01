import { fetchJsonWithTimeout, withTimeout } from './request.js';

const NOTIFICATIONS_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/notifications/responses`;

async function requestResponseNotifications(getAccessTokenSilently) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const { response, responseBody } = await fetchJsonWithTimeout(NOTIFICATIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar as respostas dos clientes.');
  }

  return responseBody;
}

async function markResponseNotificationsRead(getAccessTokenSilently) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const response = await withTimeout(fetch(`${NOTIFICATIONS_URL}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }));

  if (!response.ok) {
    throw new Error('Não foi possível marcar as respostas como vistas.');
  }
}

export { markResponseNotificationsRead, requestResponseNotifications };
