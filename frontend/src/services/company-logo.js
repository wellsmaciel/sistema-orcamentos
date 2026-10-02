import { withTimeout } from './request.js';

const LOGO_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/company/logo`;

async function readErrorMessage(response, fallbackMessage) {
  try {
    const responseBody = await response.json();
    return responseBody.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function requestWithToken(getAccessTokenSilently, options = {}) {
  const accessToken = await withTimeout(getAccessTokenSilently());

  try {
    return await withTimeout(fetch(LOGO_URL, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    }));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    }

    throw error;
  }
}

// Devolve a imagem atual como Blob, ou null quando a empresa ainda não tem logo.
async function requestCompanyLogo(getAccessTokenSilently) {
  const response = await requestWithToken(getAccessTokenSilently);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Não foi possível carregar o logo.'));
  }

  return response.blob();
}

async function saveCompanyLogo(getAccessTokenSilently, logoBlob) {
  const response = await requestWithToken(getAccessTokenSilently, {
    method: 'PUT',
    headers: { 'Content-Type': logoBlob.type },
    body: logoBlob,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Não foi possível salvar o logo.'));
  }
}

async function removeCompanyLogo(getAccessTokenSilently) {
  const response = await requestWithToken(getAccessTokenSilently, { method: 'DELETE' });

  if (!response.ok && response.status !== 404) {
    throw new Error(await readErrorMessage(response, 'Não foi possível remover o logo.'));
  }
}

export { removeCompanyLogo, requestCompanyLogo, saveCompanyLogo };
