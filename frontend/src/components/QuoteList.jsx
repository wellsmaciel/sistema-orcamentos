import { useEffect, useState } from 'react';

const statusLabels = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  ACCEPTED: 'Aceito',
  REJECTED: 'Recusado',
};

function formatAmount(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

function formatDate(value) {
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
}

async function requestQuotes(getAccessTokenSilently) {
  const accessToken = await getAccessTokenSilently();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar os orçamentos.');
  }

  return responseBody.items;
}

function QuoteList({ getAccessTokenSilently, onEdit }) {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isCancelled = false;

    requestQuotes(getAccessTokenSilently)
      .then((items) => {
        if (!isCancelled) {
          setQuotes(items);
          setErrorMessage('');
        }
      })
      .catch((requestError) => {
        if (!isCancelled) {
          setQuotes([]);
          setErrorMessage(requestError.message);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [getAccessTokenSilently]);

  async function handleRefresh() {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const items = await requestQuotes(getAccessTokenSilently);

      setQuotes(items);
    } catch (requestError) {
      setQuotes([]);
      setErrorMessage(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleRefresh} disabled={isLoading}>
        {isLoading ? 'Atualizando...' : 'Atualizar lista'}
      </button>

      {isLoading && <p role="status">Carregando orçamentos...</p>}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {!isLoading && !errorMessage && quotes.length === 0 && <p>Nenhum orçamento cadastrado.</p>}

      {!isLoading && !errorMessage && quotes.length > 0 && (
        <ul>
          {quotes.map((quote) => (
            <li key={quote.id}>
              <article>
                {quote.status === 'DRAFT' && onEdit && (
                  <button type="button" onClick={() => onEdit(quote)}>
                    Editar orçamento
                  </button>
                )}
                <h3>{quote.client.name}</h3>

                <p>
                  <strong>Situação:</strong> {statusLabels[quote.status] ?? quote.status}
                </p>

                <p>
                  <strong>Valor:</strong> {formatAmount(quote.totalAmount)}
                </p>

                <p>
                  <strong>Data do serviço:</strong> {formatDate(quote.serviceDate)}
                </p>

                <p>
                  <strong>Descrição:</strong> {quote.description}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default QuoteList;
