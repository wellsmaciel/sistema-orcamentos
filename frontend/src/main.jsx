import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App.jsx';
import AccessibilityControls from './components/AccessibilityControls.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import SiteFooter from './components/SiteFooter.jsx';

// A política de privacidade é pública: abre sem login e sem passar pelo Auth0.
const isPrivacyPage = window.location.pathname.replace(/\/+$/, '') === '/privacidade';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPrivacyPage ? (
      <>
        <AccessibilityControls />
        <PrivacyPolicy />
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
