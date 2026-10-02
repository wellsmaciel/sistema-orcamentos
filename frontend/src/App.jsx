import { useState } from 'react';
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
import useScrollToTop from './hooks/useScrollToTop.js';

function App() {
  const { error, getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();
  const publicToken = new URLSearchParams(window.location.search).get('quote');
  const [clients, setClients] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isLoadingQuoteClients, setIsLoadingQuoteClients] = useState(false);
  const [quoteClientsError, setQuoteClientsError] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [reviewQuoteId, setReviewQuoteId] = useState(null);
  const [focusQuote, setFocusQuote] = useState(null);

  useScrollToTop(currentView);

  if (publicToken) {
    return <PublicQuote publicToken={publicToken} />;
  }

  function handleLogout() {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  async function handleNavigate(view) {
    setSelectedQuote(null);
    setReviewQuoteId(null);
    setFocusQuote(null);
    setCurrentView(view);
    setSelectedClient(null);
    if (view !== 'new-quote') {
      return;
    }

    try {
      setIsLoadingQuoteClients(true);
      setQuoteClientsError('');

      const items = await requestClients(getAccessTokenSilently);

      setClients(items);
    } catch (requestError) {
      setClients([]);
      setQuoteClientsError(requestError.message);
    } finally {
      setIsLoadingQuoteClients(false);
    }
  }

  function handleEditQuote(quote) {
    setSelectedQuote(quote);
    setCurrentView('edit-quote');
  }

  function handleOpenQuoteFromNotification(item) {
    setReviewQuoteId(null);
    setFocusQuote({ quoteId: item.quoteId, quoteNumber: item.quoteNumber });
    setCurrentView('quotes');
  }

  function handleReviewNewQuote(quote) {
    setReviewQuoteId(quote.id);
    setCurrentView('quotes');
  }

  // Depois de salvar a edição, a lista abre filtrada pelo número, com a revisão do rascunho aberta, como na criação.
  function handleQuoteUpdated(savedQuote) {
    setSelectedQuote(null);
    setReviewQuoteId(savedQuote.id);
    setFocusQuote({ quoteId: savedQuote.id, quoteNumber: savedQuote.quoteNumber, highlight: false });
    setCurrentView('quotes');
  }

  function handleBack() {
    if (currentView === 'edit-quote') {
      setSelectedQuote(null);
      setCurrentView('quotes');
      return;
    }

    setCurrentView('home');
  }

  if (isLoading) {
    return <p>Carregando autenticação...</p>;
  }

  if (error) {
    return <p>Não foi possível autenticar: {error.message}</p>;
  }
  function handleEditClient(client) {
    setSelectedClient(client);
    setCurrentView('edit-client');
  }

  function handleClientSaved() {
    setSelectedClient(null);
    setCurrentView('clients');
  }
  return (
    <main>
      <h1 className="app-title">
        <img src="/logo-auth0.png" alt="" width="72" height="40" />
        Sistema de Orçamentos
      </h1>

      {!isAuthenticated ? (
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
        <>
          <TopNav currentView={currentView} onNavigate={handleNavigate} onLogout={handleLogout} />

          <p>
            Você entrou como <strong>{user?.name ?? user?.email}</strong>.
          </p>

          {currentView === 'home' ? (
            <>
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

                  <ClientList getAccessTokenSilently={getAccessTokenSilently} onEdit={handleEditClient} onNewClient={() => handleNavigate('new-client')} />
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

                  {!isLoadingQuoteClients && !quoteClientsError && clients.length > 0 && <QuoteForm clients={clients} getAccessTokenSilently={getAccessTokenSilently} onReview={handleReviewNewQuote} />}
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
      )}
    </main>
  );
}

export default App;
