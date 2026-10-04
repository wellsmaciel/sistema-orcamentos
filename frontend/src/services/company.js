import { createApiError } from '../utils/validation-message.js';
import { requestApi } from './request.js';

async function requestCompany(getAccessTokenSilently) {
  const { response, responseBody } = await requestApi(getAccessTokenSilently, '/api/v1/company');

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar os dados profissionais.');
  }

  return responseBody;
}

async function saveCompany(getAccessTokenSilently, company) {
  const { response, responseBody } = await requestApi(getAccessTokenSilently, '/api/v1/company', { method: 'PUT', body: company });

  if (!response.ok) {
    throw createApiError(responseBody, 'Não foi possível salvar os dados profissionais.');
  }

  return responseBody;
}

export { requestCompany, saveCompany };
