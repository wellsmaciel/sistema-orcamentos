import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

import './App.css';
import ClientForm from './components/ClientForm.jsx';
import ClientList from './components/ClientList.jsx';
import Dashboard from './components/Dashboard.jsx';
import QuoteForm from './components/QuoteForm.jsx';
import QuoteList from './components/QuoteList.jsx';

function App() {
  const { error, getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  const [apiProfile, setApiProfile] = useState(null);
  const [apiError, setApiError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [clients, setClients] = useState([]);
  const [currentView, setCurrentView] = useState('home');

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

          {currentView === 'home' ? (
            <Dashboard onNavigate={setCurrentView} />
          ) : (
            <>
              <button type="button" onClick={() => setCurrentView('home')}>
                Voltar ao início
              </button>

              {currentView === 'clients' && (
                <section>
                  <h2>Clientes</h2>

                  <ClientForm getAccessTokenSilently={getAccessTokenSilently} />

                  <ClientList clients={clients} getAccessTokenSilently={getAccessTokenSilently} onClientsChange={setClients} />
                </section>
              )}

              {currentView === 'new-quote' && (
                <section>
                  <h2>Novo orçamento</h2>

                  <ClientList clients={clients} getAccessTokenSilently={getAccessTokenSilently} onClientsChange={setClients} />

                  <QuoteForm clients={clients} getAccessTokenSilently={getAccessTokenSilently} />
                </section>
              )}

              {currentView === 'quotes' && (
                <section>
                  <h2>Meus orçamentos</h2>

                  <QuoteList getAccessTokenSilently={getAccessTokenSilently} />
                </section>
              )}

              {currentView === 'account' && (
                <section>
                  <h2>Minha conta</h2>

                  <button type="button" onClick={handleLoadProfile} disabled={isLoadingProfile}>
                    {isLoadingProfile ? 'Consultando...' : 'Consultar meus dados'}
                  </button>

                  {apiProfile && <pre>{JSON.stringify(apiProfile, null, 2)}</pre>}

                  {apiError && <p>{apiError}</p>}
                </section>
              )}
            </>
          )}

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
