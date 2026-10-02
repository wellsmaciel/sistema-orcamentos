import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App.jsx';
import AccessibilityControls from './components/AccessibilityControls.jsx';
import HelpGuide from './components/HelpGuide.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import { installPortugueseValidation } from './utils/form-validation-messages.js';

installPortugueseValidation();

// A política de privacidade e a ajuda são públicas: abrem sem login e sem passar pelo Auth0.
const PUBLIC_PAGES = { '/privacidade': PrivacyPolicy, '/ajuda': HelpGuide };
const PublicPage = PUBLIC_PAGES[window.location.pathname.replace(/\/+$/, '')];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {PublicPage ? (
      <>
        <AccessibilityControls />
        <PublicPage />
        <SiteFooter />
      </>
    ) : (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
        // A tela de login do Auth0 aparece sempre em português do Brasil, independentemente do navegador.
        ui_locales: 'pt-BR',
      }}
    >
      <AccessibilityControls />
      <App />
      <SiteFooter />
    </Auth0Provider>
    )}
  </StrictMode>,
);
