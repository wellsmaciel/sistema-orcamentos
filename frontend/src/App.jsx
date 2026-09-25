import { useAuth0 } from '@auth0/auth0-react';
import './App.css';

function App() {
  const { error, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

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
