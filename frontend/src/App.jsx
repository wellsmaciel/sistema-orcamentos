import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './App.css';

function App() {
  const { error, getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  const [apiProfile, setApiProfile] = useState(null);
  const [apiError, setApiError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  async function handleLoadProfile() {
    try {
      setIsLoadingProfile(true);
      setApiError('');

      const accessToken = await getAccessTokenSilently();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.message ?? 'Não foi possível consultar o perfil.');
      }

      setApiProfile(responseBody);
    } catch (requestError) {
      setApiProfile(null);
      setApiError(requestError.message);
    } finally {
      setIsLoadingProfile(false);
    }
  }

  if (isLoading) {
    return <p>Carregando autenticação...</p>;
  }

  if (error) {
    return <p>Não foi possível autenticar: {error.message}</p>;
  }

  return (
    <main>
      <h1>Sistema de Orçamentos</h1>

      {!isAuthenticated ? (
        <>
          <p>Entre para acessar o sistema.</p>

          <button type="button" onClick={() => loginWithRedirect()}>
            Entrar
          </button>
        </>
      ) : (
        <>
          <p>
            Você entrou como <strong>{user?.name ?? user?.email}</strong>.
          </p>

          <button type="button" onClick={handleLoadProfile} disabled={isLoadingProfile}>
            {isLoadingProfile ? 'Consultando...' : 'Consultar perfil na API'}
          </button>

          {apiProfile && <pre>{JSON.stringify(apiProfile, null, 2)}</pre>}

          {apiError && <p>{apiError}</p>}

          <button
            type="button"
            onClick={() =>
              logout({
                logoutParams: {
                  returnTo: window.location.origin,
                },
              })
            }
          >
            Sair
          </button>
        </>
      )}
    </main>
  );
}

export default App;
