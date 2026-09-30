import { fetchJsonWithTimeout, withTimeout } from './request.js';

async function requestClientApi(getAccessTokenSilently, path, { method = 'GET', body } = {}) {
  const accessToken = method === 'GET'
    ? await withTimeout(getAccessTokenSilently())
    : await getAccessTokenSilently();

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const requestOptions = {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  if (method === 'GET') {
    const { response, responseBody } = await fetchJsonWithTimeout(`${import.meta.env.VITE_API_BASE_URL}${path}`, requestOptions);
    if (!response.ok) {
      const detailsMessage = responseBody.details?.map((detail) => `${detail.field}: ${detail.message}`).join(' ');
      const error = new Error(detailsMessage || responseBody.message || 'Não foi possível concluir a operação com o cliente.');
      error.code = responseBody.code;
      throw error;
    }
    return responseBody;
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, requestOptions);

  if (response.status === 204) {
    return null;
  }

  const responseBody = await response.json();

  if (!response.ok) {
    const detailsMessage = responseBody.details?.map((detail) => `${detail.field}: ${detail.message}`).join(' ');

    const error = new Error(detailsMessage || responseBody.message || 'Não foi possível concluir a operação com o cliente.');

    error.code = responseBody.code;

    throw error;
  }

  return responseBody;
}

async function requestClients(getAccessTokenSilently) {
  const responseBody = await requestClientApi(getAccessTokenSilently, '/api/v1/clients');

  return responseBody.items;
}

async function saveClient(getAccessTokenSilently, input, clientId) {
  const path = clientId ? `/api/v1/clients/${clientId}` : '/api/v1/clients';

  return requestClientApi(getAccessTokenSilently, path, {
    method: clientId ? 'PUT' : 'POST',
    body: input,
  });
}

async function deleteClient(getAccessTokenSilently, clientId) {
  return requestClientApi(getAccessTokenSilently, `/api/v1/clients/${clientId}`, {
    method: 'DELETE',
  });
}

async function deactivateClient(getAccessTokenSilently, clientId) {
  return requestClientApi(getAccessTokenSilently, `/api/v1/clients/${clientId}/deactivate`, {
    method: 'POST',
  });
}
async function requestClientsPage(getAccessTokenSilently, { active = true, search = '', page = 1 } = {}) {
  const parameters = new URLSearchParams({
    active: String(active),
    search,
    page: String(page),
  });

  return requestClientApi(getAccessTokenSilently, `/api/v1/clients/search?${parameters.toString()}`);
}

async function reactivateClient(getAccessTokenSilently, clientId) {
  return requestClientApi(getAccessTokenSilently, `/api/v1/clients/${clientId}/reactivate`, {
    method: 'POST',
  });
}
export { requestClients, saveClient, deleteClient, deactivateClient, requestClientsPage, reactivateClient };
