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

function buildPublicQuoteUrl(publicToken) {
  const publicUrl = new URL(window.location.origin);

  publicUrl.searchParams.set('quote', publicToken);

  return publicUrl.toString();
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

async function requestQuoteCorrection(getAccessTokenSilently, quoteId) {
  const accessToken = await getAccessTokenSilently();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes/${quoteId}/corrections`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível criar a correção.');
  }

  return responseBody;
}

function QuoteList({ getAccessTokenSilently, onEdit }) {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmingQuoteId, setConfirmingQuoteId] = useState(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState(null);
  const [creatingCorrectionQuoteId, setCreatingCorrectionQuoteId] = useState(null);
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

  async function handleCopyLink(quote) {
    try {
      setErrorMessage('');

      await navigator.clipboard.writeText(buildPublicQuoteUrl(quote.publicToken));

      setCopiedQuoteId(quote.id);
    } catch {
      setErrorMessage('Não foi possível copiar o link. Utilize a opção de abrir o orçamento.');
    }
  }
  async function handleCreateCorrection(quote) {
    try {
      setCreatingCorrectionQuoteId(quote.id);
      setErrorMessage('');

      const correction = await requestQuoteCorrection(getAccessTokenSilently, quote.id);

      if (onEdit) {
        onEdit(correction);
      }
    } catch (requestError) {
      setErrorMessage(requestError.message);
    } finally {
      setCreatingCorrectionQuoteId(null);
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
            const isCreatingCorrection = creatingCorrectionQuoteId === quote.id;

            const existingCorrection = quotes.find((candidate) => candidate.correctedFromId === quote.id);

            const originalQuote = quote.correctedFromId ? quotes.find((candidate) => candidate.id === quote.correctedFromId) : null;
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
                  {quote.publicToken && (
                    <div>
                      <a href={buildPublicQuoteUrl(quote.publicToken)} target="_blank" rel="noreferrer">
                        Abrir orçamento público
                      </a>

                      <button type="button" onClick={() => handleCopyLink(quote)}>
                        {copiedQuoteId === quote.id ? 'Link copiado' : 'Copiar link'}
                      </button>
                    </div>
                  )}
                  {quote.status === 'REJECTED' && !existingCorrection && onEdit && (
                    <button type="button" onClick={() => handleCreateCorrection(quote)} disabled={isCreatingCorrection}>
                      {isCreatingCorrection ? 'Criando correção...' : 'Criar correção'}
                    </button>
                  )}

                  {existingCorrection && (
                    <p>
                      <strong>Correção criada:</strong> Orçamento nº {formatQuoteNumber(existingCorrection.quoteNumber)}
                    </p>
                  )}

                  {originalQuote && (
                    <p>
                      <strong>Correção do orçamento:</strong> nº {formatQuoteNumber(originalQuote.quoteNumber)}
                    </p>
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
                  {quote.rejectionReason && (
                    <p>
                      <strong>Motivo da recusa:</strong> {quote.rejectionReason}
                    </p>
                  )}
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
