import { useState } from 'react';

function ClientList({ clients, getAccessTokenSilently, onClientsChange }) {
  const [listError, setListError] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  async function handleLoadClients() {
    try {
      setIsLoadingClients(true);
      setListError('');

      const accessToken = await getAccessTokenSilently();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/clients`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.message ?? 'Não foi possível consultar os clientes.');
      }

      onClientsChange(responseBody.items);
      setHasLoaded(true);
    } catch (requestError) {
      onClientsChange([]);
      setListError(requestError.message);
    } finally {
      setIsLoadingClients(false);
    }
  }

  return (
    <section>
      <h2>Clientes cadastrados</h2>

      <button type="button" onClick={handleLoadClients} disabled={isLoadingClients}>
        {isLoadingClients ? 'Consultando...' : 'Atualizar clientes'}
      </button>

      {listError && <p role="alert">{listError}</p>}

      {hasLoaded && clients.length === 0 && <p>Nenhum cliente cadastrado.</p>}

      {clients.length > 0 && (
        <ul>
          {clients.map((client) => (
            <li key={client.id}>
              <strong>{client.name}</strong>
              <p>{client.email}</p>
              <p>{client.phone}</p>
              <p>
                {client.address.street}, {client.address.number}
                {client.address.complement ? `, ${client.address.complement}` : ''}
              </p>
              <p>
                {client.address.district}, {client.address.city} – {client.address.state}, CEP {client.address.postalCode}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ClientList;
