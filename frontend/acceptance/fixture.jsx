import { createRoot } from 'react-dom/client';
import QuoteList from '../src/components/QuoteList.jsx';
import PublicQuote from '../src/components/PublicQuote.jsx';
import AccessibilityControls from '../src/components/AccessibilityControls.jsx';
import QuoteForm from '../src/components/QuoteForm.jsx';
import CompanyForm from '../src/components/CompanyForm.jsx';
import ClientForm from '../src/components/ClientForm.jsx';
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

createRoot(document.getElementById('root')).render(
  <>
    <AccessibilityControls />
    {content}
  </>,
);
