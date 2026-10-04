import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { requestClients } from './services/client.js';
import './App.css';
import ClientForm from './components/ClientForm.jsx';
import ClientList from './components/ClientList.jsx';
import Dashboard from './components/Dashboard.jsx';
import TopNav from './components/TopNav.jsx';
import ResponseNotifications from './components/ResponseNotifications.jsx';
import AccountView from './components/AccountView.jsx';
import ManagementView from './components/ManagementView.jsx';
import QuoteForm from './components/QuoteForm.jsx';
import QuoteList from './components/QuoteList.jsx';
import PublicQuote from './components/PublicQuote.jsx';
import CompanyForm from './components/CompanyForm.jsx';
import ProfileReminder from './components/ProfileReminder.jsx';
import useAppNavigation, { clearNavigationHistory } from './hooks/useAppNavigation.js';
import useScrollToTop from './hooks/useScrollToTop.js';

// Endereço usado pelo Auth0 quando precisa reiniciar o login (por exemplo, depois do botão Voltar).
const isLoginRoute = window.location.pathname.replace(/\/+$/, '') === '/entrar';

function App() {
  const { error, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const publicToken = new URLSearchParams(window.location.search).get('quote');

  useEffect(() => {
    if (isLoading || error || !isLoginRoute) {
      return;
    }

    if (isAuthenticated) {
      window.history.replaceState(window.history.state, '', '/');
    } else {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, error, loginWithRedirect]);

  if (publicToken) {
    return <PublicQuote publicToken={publicToken} />;
  }

  if (isLoading) {
    return <p>Carregando autenticação...</p>;
  }

  if (error) {
    return <p>Não foi possível autenticar: {error.message}</p>;
  }

  return (
    <main>
      <h1 className="app-title">
        <img src="/logo-auth0.png" alt="" width="72" height="40" />
        Sistema de Orçamentos
      </h1>

      {!isAuthenticated && isLoginRoute ? (
        <p role="status">Abrindo a tela de login...</p>
      ) : !isAuthenticated ? (
        <>
          <p>Crie, compartilhe e acompanhe seus orçamentos em um só lugar.</p>

          <button type="button" className="button-primary" onClick={() => loginWithRedirect()}>
            Entrar no sistema
          </button>

          <p>
            Primeira vez por aqui? Veja <a href="/ajuda">como usar o sistema</a>.
          </p>
        </>
      ) : (
        <AuthenticatedApp />
      )}
    </main>
  );
}

// Só existe com a sessão aberta: ao sair, todo o estado das telas some junto.
function AuthenticatedApp() {
  const { getAccessTokenSilently, logout, user } = useAuth0();
  const { navigation, navigate, goBackTo } = useAppNavigation(user?.sub);
  const { view: currentView, selectedQuote, selectedClient, reviewQuoteId, focusQuote, createdClient, quoteClientId } = navigation;
  // Clientes do formulário de novo orçamento, recarregados a cada vez que a tela é aberta.
  const [quoteClients, setQuoteClients] = useState({ key: null, items: [], error: '' });
  const isLoadingQuoteClients = currentView === 'new-quote' && quoteClients.key !== navigation.key;
  const clients = quoteClients.items;
  const quoteClientsError = isLoadingQuoteClients ? '' : quoteClients.error;

  useScrollToTop(navigation.key);

  useEffect(() => {
    if (currentView !== 'new-quote') {
      return undefined;
    }

    let ignoreResult = false;
    const loadKey = navigation.key;

    requestClients(getAccessTokenSilently)
      .then((items) => {
        if (!ignoreResult) {
          setQuoteClients({ key: loadKey, items, error: '' });
        }
      })
      .catch((requestError) => {
        if (!ignoreResult) {
          setQuoteClients({ key: loadKey, items: [], error: requestError.message });
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [currentView, navigation.key, getAccessTokenSilently]);

  // Antes de sair, a tela guardada no histórico da aba é apagada, para a próxima conta não herdá-la.
  function handleLogout() {
    clearNavigationHistory();
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  function handleNavigate(view, { clientId = null } = {}) {
    navigate({ view, quoteClientId: clientId });
  }

  function handleEditQuote(quote) {
    navigate({ view: 'edit-quote', selectedQuote: quote });
  }

  function handleOpenQuoteFromNotification(item) {
    navigate({ view: 'quotes', focusQuote: { quoteId: item.quoteId, quoteNumber: item.quoteNumber } });
  }

  // Depois de salvar, a tela do formulário é substituída: o Voltar não reabre um formulário já enviado.
  function handleReviewNewQuote(quote) {
    navigate({ view: 'quotes', reviewQuoteId: quote.id }, { replace: true });
  }

  // Depois de salvar a edição, a lista abre filtrada pelo número, com a revisão do rascunho aberta, como na criação.
  function handleQuoteUpdated(savedQuote) {
    navigate(
      { view: 'quotes', reviewQuoteId: savedQuote.id, focusQuote: { quoteId: savedQuote.id, quoteNumber: savedQuote.quoteNumber, highlight: false } },
      { replace: true },
    );
  }

  // Os botões "Voltar" e "Cancelar" da tela não criam entrada nova no histórico (ver goBackTo).
  function handleBack() {
    if (currentView === 'edit-quote') {
      goBackTo('quotes');
      return;
    }

    if (currentView === 'new-client' || currentView === 'edit-client') {
      goBackTo('clients');
      return;
    }

    goBackTo('home');
  }

  function handleEditClient(client) {
    navigate({ view: 'edit-client', selectedClient: client });
  }

  // Só um cliente novo mostra o atalho para criar o orçamento; na edição, a lista volta como antes.
  function handleClientSaved(savedClient) {
    navigate({ view: 'clients', createdClient: selectedClient ? null : savedClient }, { replace: true });
  }

  return (
    <>
      <TopNav currentView={currentView} onNavigate={handleNavigate} onLogout={handleLogout} />

      <p>
        Você entrou como <strong>{user?.name ?? user?.email}</strong>.
      </p>

      {currentView === 'home' ? (
        <>
          <ProfileReminder getAccessTokenSilently={getAccessTokenSilently} onOpenProfile={() => handleNavigate('company')} />
          <ResponseNotifications
            getAccessTokenSilently={getAccessTokenSilently}
            onOpenQuotes={() => handleNavigate('quotes')}
            onOpenQuote={handleOpenQuoteFromNotification}
          />
          <Dashboard onNavigate={handleNavigate} />
        </>
      ) : (
        <>
          <button type="button" className={currentView === 'edit-quote' || currentView === 'new-client' || currentView === 'edit-client' ? undefined : 'back-to-menu'} onClick={handleBack}>
            {currentView === 'edit-quote' ? 'Voltar aos orçamentos' : currentView === 'new-client' || currentView === 'edit-client' ? 'Voltar aos clientes' : 'Voltar ao menu'}
          </button>

          {currentView === 'company' && <CompanyForm getAccessTokenSilently={getAccessTokenSilently} />}

          {currentView === 'management' && <ManagementView getAccessTokenSilently={getAccessTokenSilently} onOpenQuotes={() => handleNavigate('quotes')} />}

          {currentView === 'clients' && (
            <section>
              <h2>Clientes</h2>

              <ClientList
                getAccessTokenSilently={getAccessTokenSilently}
                onEdit={handleEditClient}
                onNewClient={() => handleNavigate('new-client')}
                createdClient={createdClient}
                onCreateQuote={(client) => handleNavigate('new-quote', { clientId: client.id })}
              />
            </section>
          )}

          {(currentView === 'new-client' || currentView === 'edit-client') && (
            <ClientForm
              key={selectedClient?.id ?? 'new-client'}
              getAccessTokenSilently={getAccessTokenSilently}
              client={selectedClient}
              onSaved={handleClientSaved}
              onCancel={handleBack}
            />
          )}

          {currentView === 'new-quote' && (
            <section>
              <h2>Novo orçamento</h2>

              <ProfileReminder getAccessTokenSilently={getAccessTokenSilently} onOpenProfile={() => handleNavigate('company')} />

              {isLoadingQuoteClients && <p role="status">Carregando clientes...</p>}

              {quoteClientsError && <p role="alert">{quoteClientsError}</p>}

              {!isLoadingQuoteClients && !quoteClientsError && clients.length === 0 && (
                <>
                  <p>Cadastre um cliente antes de criar um orçamento.</p>

                  <button type="button" onClick={() => handleNavigate('clients')}>
                    Ir para clientes
                  </button>
                </>
              )}

              {!isLoadingQuoteClients && !quoteClientsError && clients.length > 0 && (
                <QuoteForm
                  key={quoteClientId ?? 'sem-cliente'}
                  clients={clients}
                  getAccessTokenSilently={getAccessTokenSilently}
                  initialClientId={quoteClientId}
                  onReview={handleReviewNewQuote}
                />
              )}
            </section>
          )}

          {currentView === 'quotes' && (
            <section>
              <h2>Meus orçamentos</h2>

              <QuoteList
                key={focusQuote?.quoteId ?? 'todos'}
                getAccessTokenSilently={getAccessTokenSilently}
                onEdit={handleEditQuote}
                initialReviewQuoteId={reviewQuoteId}
                focusQuote={focusQuote}
                onOpenProfile={() => handleNavigate('company')}
              />
            </section>
          )}

          {currentView === 'edit-quote' && selectedQuote && <QuoteForm quote={selectedQuote} getAccessTokenSilently={getAccessTokenSilently} onSaved={handleQuoteUpdated} />}

          {currentView === 'account' && (
            <AccountView getAccessTokenSilently={getAccessTokenSilently} auth0User={user} onLogout={handleLogout} />
          )}
        </>
      )}

      {currentView === 'home' && (
        <button
          type="button"
          className="home-logout"
          onClick={handleLogout}
        >
          Sair da conta
        </button>
      )}
    </>
  );
}

export default App;
