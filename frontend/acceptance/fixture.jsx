import { createRoot } from 'react-dom/client';
import QuoteList from '../src/components/QuoteList.jsx';
import PublicQuote from '../src/components/PublicQuote.jsx';
import AccessibilityControls from '../src/components/AccessibilityControls.jsx';
import '../src/index.css';
import '../src/App.css';

const parameters = new URLSearchParams(window.location.search);
const mode = parameters.get('mode');

createRoot(document.getElementById('root')).render(
  <>
    <AccessibilityControls />
    {mode === 'public' ? <PublicQuote publicToken="test-public-token" /> : <QuoteList getAccessTokenSilently={async () => 'acceptance-test-token'} />}
  </>,
);
