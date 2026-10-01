import { createRoot } from 'react-dom/client';
import QuoteList from '../src/components/QuoteList.jsx';
import PublicQuote from '../src/components/PublicQuote.jsx';
import AccessibilityControls from '../src/components/AccessibilityControls.jsx';
import QuoteForm from '../src/components/QuoteForm.jsx';
import CompanyForm from '../src/components/CompanyForm.jsx';
import ClientForm from '../src/components/ClientForm.jsx';
import ActivityList from '../src/components/ActivityList.jsx';
import ManagementView from '../src/components/ManagementView.jsx';
import AccountView from '../src/components/AccountView.jsx';
import TopNav from '../src/components/TopNav.jsx';
import Dashboard from '../src/components/Dashboard.jsx';
import ResponseNotifications from '../src/components/ResponseNotifications.jsx';
import '../src/index.css';
import '../src/App.css';

const parameters = new URLSearchParams(window.location.search);
const mode = parameters.get('mode');
const getAccessTokenSilently = async () => 'acceptance-test-token';
const client = {
  id: 'client-1',
  name: 'Cliente Exemplo',
  email: 'cliente@example.com',
  phone: '11999999999',
  active: true,
  address: {
    street: 'Rua Principal', number: '10', complement: '', postalCode: '01001-000',
    district: 'Centro', city: 'São Paulo', state: 'SP',
  },
};

function showReviewRequest(quote) {
  document.body.dataset.reviewRequested = quote.id;
}

let content = <QuoteList getAccessTokenSilently={getAccessTokenSilently} initialReviewQuoteId={parameters.get('review')} />;
if (mode === 'public') content = <PublicQuote publicToken="test-public-token" />;
if (mode === 'quote-form') content = <QuoteForm clients={[client]} getAccessTokenSilently={getAccessTokenSilently} onReview={showReviewRequest} />;
if (mode === 'company') content = <CompanyForm getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'client-edit') content = <ClientForm client={client} getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'activities') content = <ActivityList getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'management') content = <ManagementView getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'account') {
  const auth0User = { sub: parameters.get('login') === 'google' ? 'google-oauth2|123' : 'auth0|123', email: 'prestador@example.com' };
  content = <AccountView getAccessTokenSilently={getAccessTokenSilently} auth0User={auth0User} onLogout={() => { document.body.dataset.loggedOut = 'true'; }} />;
}
if (mode === 'notifications') {
  content = <ResponseNotifications getAccessTokenSilently={getAccessTokenSilently} onOpenQuotes={() => { document.body.dataset.openedQuotes = 'true'; }} />;
}

// Modos com a barra de navegação, imitando a estrutura do App: ?mode=layout&view=quotes|new-quote|clients
if (mode === 'layout') {
  const view = parameters.get('view') ?? 'quotes';
  const navigate = (target) => { document.body.dataset.navigatedTo = target; };
  content = (
    <main>
      <TopNav currentView={view} onNavigate={navigate} onLogout={() => { document.body.dataset.loggedOut = 'true'; }} />
      {view === 'home' && <Dashboard onNavigate={navigate} />}
      {view === 'quotes' && <QuoteList getAccessTokenSilently={getAccessTokenSilently} />}
      {view === 'new-quote' && <QuoteForm clients={[client]} getAccessTokenSilently={getAccessTokenSilently} />}
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <>
    <AccessibilityControls />
    {content}
  </>,
);
