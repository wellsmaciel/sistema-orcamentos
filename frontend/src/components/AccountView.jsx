import { useEffect, useState } from 'react';
import { requestMyProfile, requestPasswordReset } from '../services/account.js';
import { LOGIN_METHOD_LABELS, getLoginMethod } from '../utils/account.js';
import ActivityList from './ActivityList.jsx';

const DEFAULT_CONNECTION = 'Username-Password-Authentication';

function AccountView({ getAccessTokenSilently, auth0User, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [passwordReset, setPasswordReset] = useState({ status: 'idle', message: '' });

  const loginMethod = getLoginMethod(auth0User?.sub);

  useEffect(() => {
    let ignoreResult = false;

    async function loadProfile() {
      try {
        setProfileError('');
        const result = await requestMyProfile(getAccessTokenSilently);

        if (!ignoreResult) {
          setProfile(result);
        }
      } catch (requestError) {
        if (!ignoreResult) {
          setProfileError(requestError.message);
        }
      }
    }

    loadProfile();

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently, refreshIndex]);

  async function handlePasswordReset() {
    const email = profile?.email ?? auth0User?.email;

    try {
      setPasswordReset({ status: 'sending', message: '' });
      await requestPasswordReset({
        domain: import.meta.env.VITE_AUTH0_DOMAIN,
        clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
        connection: import.meta.env.VITE_AUTH0_DB_CONNECTION || DEFAULT_CONNECTION,
        email,
      });
      setPasswordReset({ status: 'sent', message: `Enviamos um link para ${email}. Abra o e-mail para definir a nova senha e confira também a caixa de spam.` });
    } catch (requestError) {
      setPasswordReset({ status: 'error', message: requestError.message });
    }
  }

  return (
    <section aria-labelledby="account-title">
      <h2 id="account-title">Minha conta</h2>

      {profileError && (
        <>
          <p role="alert">{profileError}</p>
          <button type="button" onClick={() => setRefreshIndex((index) => index + 1)}>Tentar novamente</button>
        </>
      )}

      {!profile && !profileError && <p role="status">Carregando seus dados...</p>}

      {profile && (
        <dl className="account-details">
          <div>
            <dt>Nome</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>Forma de acesso</dt>
            <dd>{LOGIN_METHOD_LABELS[loginMethod]}</dd>
          </div>
        </dl>
      )}

      <h3>Senha</h3>
      {loginMethod === 'password' ? (
        <>
          <p>Para alterar a senha, enviaremos um link para o seu e-mail.</p>
          <button type="button" onClick={handlePasswordReset} disabled={!profile || passwordReset.status === 'sending'}>
            {passwordReset.status === 'sending' ? 'Enviando...' : 'Alterar senha'}
          </button>
          {passwordReset.status === 'sent' && <p role="status">{passwordReset.message}</p>}
          {passwordReset.status === 'error' && <p role="alert">{passwordReset.message}</p>}
        </>
      ) : (
        <p>Sua forma de acesso é {LOGIN_METHOD_LABELS[loginMethod]}. A senha é gerenciada por esse provedor, fora do Sistema de Orçamentos.</p>
      )}

      <button type="button" className="account-logout" onClick={onLogout}>Sair da conta</button>

      <ActivityList getAccessTokenSilently={getAccessTokenSilently} />
    </section>
  );
}

export default AccountView;
