import { fetchJsonWithTimeout, withTimeout } from './request.js';

async function requestMyProfile(getAccessTokenSilently) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const { response, responseBody } = await fetchJsonWithTimeout(`${import.meta.env.VITE_API_BASE_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar seus dados.');
  }

  return responseBody;
}

// Pede ao Auth0 o e-mail de redefinição de senha. Só vale para contas de e-mail e senha;
// o Auth0 envia o link e a senha nunca passa pelo app.
async function requestPasswordReset({ domain, clientId, connection, email }) {
  const response = await withTimeout(fetch(`https://${domain}/dbconnections/change_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, email, connection }),
  }));

  if (!response.ok) {
    throw new Error('Não foi possível enviar o e-mail para alterar a senha. Tente novamente em alguns minutos.');
  }
}

export { requestMyProfile, requestPasswordReset };
