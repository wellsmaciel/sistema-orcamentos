import { createApiError } from '../utils/validation-message.js';
import { requestApi } from './request.js';

async function requestClientApi(getAccessTokenSilently, path, options = {}) {
  const { response, responseBody } = await requestApi(getAccessTokenSilently, path, options);

  if (!response.ok) {
    throw createApiError(responseBody, 'Não foi possível concluir a operação com o cliente.');
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
