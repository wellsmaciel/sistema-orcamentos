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

function formatQuoteNumber(value) {
  return String(value).padStart(6, '0');
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

async function requestQuoteConfirmation(getAccessTokenSilently, quoteId) {
  const accessToken = await getAccessTokenSilently();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes/${quoteId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível confirmar o orçamento.');
  }

  return responseBody;
}

function QuoteList({ getAccessTokenSilently, onEdit }) {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmingQuoteId, setConfirmingQuoteId] = useState(null);

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

  async function handleConfirm(quote) {
    const shouldConfirm = window.confirm('Depois de confirmar, este orçamento não poderá mais ser editado. Deseja continuar?');

    if (!shouldConfirm) {
      return;
    }

    try {
      setConfirmingQuoteId(quote.id);
      setErrorMessage('');

      const confirmedQuote = await requestQuoteConfirmation(getAccessTokenSilently, quote.id);

      setQuotes((currentQuotes) => currentQuotes.map((currentQuote) => (currentQuote.id === confirmedQuote.id ? confirmedQuote : currentQuote)));
    } catch (requestError) {
      setErrorMessage(requestError.message);
    } finally {
      setConfirmingQuoteId(null);
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
          {quotes.map((quote) => {
            const isConfirming = confirmingQuoteId === quote.id;

            return (
              <li key={quote.id}>
                <article>
                  <h3>Orçamento nº {formatQuoteNumber(quote.quoteNumber)}</h3>

                  {quote.status === 'DRAFT' && (
                    <div>
                      {onEdit && (
                        <button type="button" onClick={() => onEdit(quote)} disabled={isConfirming}>
                          Editar orçamento
                        </button>
                      )}

                      <button type="button" onClick={() => handleConfirm(quote)} disabled={isConfirming}>
                        {isConfirming ? 'Confirmando...' : 'Confirmar orçamento'}
                      </button>
                    </div>
                  )}

                  <p>
                    <strong>Cliente:</strong> {quote.client.name}
                  </p>

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
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default QuoteList;
