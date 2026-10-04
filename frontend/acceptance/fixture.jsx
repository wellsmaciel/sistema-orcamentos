import { createRoot } from 'react-dom/client';
import QuoteList from '../src/components/QuoteList.jsx';
import PublicQuote from '../src/components/PublicQuote.jsx';
import AccessibilityControls from '../src/components/AccessibilityControls.jsx';
import QuoteForm from '../src/components/QuoteForm.jsx';
import CompanyForm from '../src/components/CompanyForm.jsx';
import ClientForm from '../src/components/ClientForm.jsx';
import ClientList from '../src/components/ClientList.jsx';
import ActivityList from '../src/components/ActivityList.jsx';
import ManagementView from '../src/components/ManagementView.jsx';
import AccountView from '../src/components/AccountView.jsx';
import TopNav from '../src/components/TopNav.jsx';
import Dashboard from '../src/components/Dashboard.jsx';
import ResponseNotifications from '../src/components/ResponseNotifications.jsx';
import NavigationFixture from './navigation-fixture.jsx';
import ScrollFixture from './scroll-fixture.jsx';
import ProfileReminder from '../src/components/ProfileReminder.jsx';
import { installPortugueseValidation } from '../src/utils/form-validation-messages.js';
import '../src/index.css';
import '../src/App.css';

installPortugueseValidation();

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

const focusQuote = parameters.get('focusId')
  ? { quoteId: parameters.get('focusId'), quoteNumber: Number(parameters.get('focusNumber')), highlight: parameters.get('focusHighlight') !== 'false' }
  : null;
const draftQuote = {
  id: 'quote-2089', quoteNumber: 2089, status: 'DRAFT', client, clientName: client.name, description: 'Troca de fiação', pricingMode: 'FIXED_TOTAL',
  items: [{ id: 'item-1', position: 1, description: 'Fiação', quantity: '1', unitPrice: null, subtotal: null }],
  totalAmount: '500.00', serviceDate: '2099-10-15', serviceAddress: client.address, locationNotes: '',
};

const openProfile = () => { document.body.dataset.openedProfile = 'true'; };

let content = (
  <QuoteList
    getAccessTokenSilently={getAccessTokenSilently}
    initialReviewQuoteId={parameters.get('review')}
    focusQuote={focusQuote}
    onOpenProfile={openProfile}
  />
);
if (mode === 'public') content = <PublicQuote publicToken="test-public-token" />;
if (mode === 'scroll') content = <ScrollFixture />;
if (mode === 'navigation') content = <NavigationFixture owner={parameters.get('user') ?? 'auth0|usuario-a'} />;
if (mode === 'profile-reminder') content = <ProfileReminder getAccessTokenSilently={getAccessTokenSilently} onOpenProfile={openProfile} />;
if (mode === 'quote-edit') {
  content = <QuoteForm quote={draftQuote} getAccessTokenSilently={getAccessTokenSilently} onSaved={(saved) => { document.body.dataset.savedQuote = `${saved.id}:${saved.quoteNumber}`; }} />;
}
if (mode === 'quote-form') {
  content = <QuoteForm clients={[client]} getAccessTokenSilently={getAccessTokenSilently} initialClientId={parameters.get('client')} onReview={showReviewRequest} />;
}
if (mode === 'clients-created') {
  content = (
    <ClientList
      getAccessTokenSilently={getAccessTokenSilently}
      onEdit={() => {}}
      onNewClient={() => {}}
      createdClient={client}
      onCreateQuote={(created) => { document.body.dataset.quoteForClient = created.id; }}
    />
  );
}
if (mode === 'company') content = <CompanyForm getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'client-edit') content = <ClientForm client={client} getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'activities') content = <ActivityList getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'management') content = <ManagementView getAccessTokenSilently={getAccessTokenSilently} />;
if (mode === 'account') {
  const auth0User = { sub: parameters.get('login') === 'google' ? 'google-oauth2|123' : 'auth0|123', email: 'prestador@example.com' };
  content = <AccountView getAccessTokenSilently={getAccessTokenSilently} auth0User={auth0User} onLogout={() => { document.body.dataset.loggedOut = 'true'; }} />;
}
if (mode === 'notifications') {
  content = (
    <ResponseNotifications
      getAccessTokenSilently={getAccessTokenSilently}
      onOpenQuotes={() => { document.body.dataset.openedQuotes = 'true'; }}
      onOpenQuote={(item) => { document.body.dataset.openedQuote = `${item.quoteId}:${item.quoteNumber}`; }}
    />
  );
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
