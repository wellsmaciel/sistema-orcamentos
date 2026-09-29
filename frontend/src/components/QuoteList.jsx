import { useEffect, useState } from 'react';
import { requestQuotesPage } from '../services/quote-list.js';

const statusLabels = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  ACCEPTED: 'Aceito',
  REJECTED: 'Recusado',
};
const initialFilters = {
  search: '',
  status: '',
  serviceDateFrom: '',
  serviceDateTo: '',
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
  const [query, setQuery] = useState({ page: 1 });
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ ...initialFilters });
  const isBusy = isLoading || confirmingQuoteId !== null || creatingCorrectionQuoteId !== null;
  useEffect(() => {
    let ignoreResult = false;

    async function loadQuotes() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const result = await requestQuotesPage(getAccessTokenSilently, query);

        if (ignoreResult) {
          return;
        }

        const lastPage = Math.max(result.totalPages, 1);

        if (query.page > lastPage) {
          setQuery((currentQuery) => ({
            ...currentQuery,
            page: lastPage,
          }));
          return;
        }

        setQuotes(result.items);
        setPagination({
          total: result.total,
          totalPages: result.totalPages,
        });
        setCopiedQuoteId(null);
      } catch (requestError) {
        if (!ignoreResult) {
          setQuotes([]);
          setErrorMessage(requestError.message);
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    loadQuotes();

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently, query, refreshIndex]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();

    if (filters.serviceDateFrom && filters.serviceDateTo && filters.serviceDateFrom > filters.serviceDateTo) {
      setErrorMessage('A data final não pode ser anterior à data inicial.');
      return;
    }

    setQuery({
      ...filters,
      search: filters.search.trim(),
      page: 1,
    });
  }

  function handleClearFilters() {
    setFilters({ ...initialFilters });
    setQuery({ page: 1 });
  }

  function handleRefresh() {
    setRefreshIndex((currentIndex) => currentIndex + 1);
  }
  async function handleConfirm(quote) {
    const shouldConfirm = window.confirm('Depois de confirmar, este orçamento não poderá mais ser editado. Deseja continuar?');

    if (!shouldConfirm) {
      return;
    }

    try {
      setConfirmingQuoteId(quote.id);
      setErrorMessage('');

      await requestQuoteConfirmation(getAccessTokenSilently, quote.id);

      setRefreshIndex((currentIndex) => currentIndex + 1);
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
      <form onSubmit={handleApplyFilters}>
        <div>
          <label htmlFor="quote-client-search">Buscar por nome do cliente</label>
          <input id="quote-client-search" name="search" type="search" value={filters.search} onChange={handleFilterChange} maxLength={150} disabled={isBusy} />
        </div>

        <div>
          <label htmlFor="quote-status-filter">Situação</label>
          <select id="quote-status-filter" name="status" value={filters.status} onChange={handleFilterChange} disabled={isBusy}>
            <option value="">Todas</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SENT">Enviado</option>
            <option value="ACCEPTED">Aceito</option>
            <option value="REJECTED">Recusado</option>
          </select>
        </div>

        <fieldset disabled={isBusy}>
          <legend>Data prevista do serviço</legend>

          <div>
            <label htmlFor="quote-service-date-from">De</label>
            <input id="quote-service-date-from" name="serviceDateFrom" type="date" value={filters.serviceDateFrom} onChange={handleFilterChange} />
          </div>

          <div>
            <label htmlFor="quote-service-date-to">Até</label>
            <input
              id="quote-service-date-to"
              name="serviceDateTo"
              type="date"
              value={filters.serviceDateTo}
              onChange={handleFilterChange}
              min={filters.serviceDateFrom || undefined}
            />
          </div>
        </fieldset>

        <button type="submit" disabled={isBusy}>
          Buscar
        </button>

        <button type="button" onClick={handleClearFilters} disabled={isBusy}>
          Limpar filtros
        </button>
      </form>
      <button type="button" onClick={handleRefresh} disabled={isBusy}>
        {isLoading ? 'Atualizando...' : 'Atualizar lista'}
      </button>

      {isLoading && <p role="status">Carregando orçamentos...</p>}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {!isLoading && !errorMessage && quotes.length === 0 && <p>Nenhum orçamento encontrado com esses filtros.</p>}

      {!isLoading && !errorMessage && quotes.length > 0 && (
        <ul>
          {quotes.map((quote) => {
            const isConfirming = confirmingQuoteId === quote.id;
            const isCreatingCorrection = creatingCorrectionQuoteId === quote.id;

            const existingCorrection = quote.correction ?? null;

            return (
              <li key={quote.id}>
                <article>
                  <h3>Orçamento nº {formatQuoteNumber(quote.quoteNumber)}</h3>

                  {quote.status === 'DRAFT' && (
                    <div>
                      {onEdit && (
                        <button type="button" onClick={() => onEdit(quote)} disabled={isBusy}>
                          Editar orçamento
                        </button>
                      )}

                      <button type="button" onClick={() => handleConfirm(quote)} disabled={isBusy}>
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
                    <button type="button" onClick={() => handleCreateCorrection(quote)} disabled={isBusy}>
                      {isCreatingCorrection ? 'Criando correção...' : 'Criar correção'}
                    </button>
                  )}

                  {existingCorrection && (
                    <p>
                      <strong>Correção criada:</strong> Orçamento nº {formatQuoteNumber(existingCorrection.quoteNumber)}
                    </p>
                  )}

                  {quote.originalQuoteNumber && (
                    <p>
                      <strong>Correção do orçamento:</strong> nº {formatQuoteNumber(quote.originalQuoteNumber)}
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
      {!isLoading && !errorMessage && <p>{pagination.total} orçamento(s) encontrado(s).</p>}

      {!isLoading && !errorMessage && pagination.totalPages > 1 && (
        <nav aria-label="Páginas de orçamentos">
          <button
            type="button"
            onClick={() =>
              setQuery((currentQuery) => ({
                ...currentQuery,
                page: currentQuery.page - 1,
              }))
            }
            disabled={isBusy || query.page === 1}
          >
            Anterior
          </button>

          <span>
            {' '}
            Página {query.page} de {pagination.totalPages}{' '}
          </span>

          <button
            type="button"
            onClick={() =>
              setQuery((currentQuery) => ({
                ...currentQuery,
                page: currentQuery.page + 1,
              }))
            }
            disabled={isBusy || query.page >= pagination.totalPages}
          >
            Próxima
          </button>
        </nav>
      )}
    </div>
  );
}
export default QuoteList;
