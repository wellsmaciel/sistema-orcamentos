import { useCallback, useEffect, useRef, useState } from 'react';
import { requestQuotesPage } from '../services/quote-list.js';
import { requestCompany } from '../services/company.js';
import { confirmQuote, createQuoteCorrection } from '../services/quote-actions.js';
import { buildEmailShareUrl, buildWhatsAppShareUrl } from '../utils/quote-share.js';
import QuoteReview from './QuoteReview.jsx';
import QuoteHistory from './QuoteHistory.jsx';
import { formatAmount, formatDate, formatQuoteNumber } from '../utils/format.js';

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

function buildPublicQuoteUrl(publicToken) {
  const publicUrl = new URL(window.location.origin);

  publicUrl.searchParams.set('quote', publicToken);

  return publicUrl.toString();
}

function QuoteList({ getAccessTokenSilently, onEdit, onOpenProfile, initialReviewQuoteId = null, focusQuote = null }) {
  // Rascunho recém-criado cuja revisão deve abrir assim que a lista carregar.
  const initialReviewRef = useRef(initialReviewQuoteId);
  // Orçamento aberto por um aviso ou recém-editado: a lista já vem filtrada pelo número dele.
  const focusSearch = focusQuote ? formatQuoteNumber(focusQuote.quoteNumber) : '';
  const [highlightQuoteId, setHighlightQuoteId] = useState(focusQuote && focusQuote.highlight !== false ? focusQuote.quoteId : null);
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmingQuoteId, setConfirmingQuoteId] = useState(null);
  const [reviewQuoteId, setReviewQuoteId] = useState(null);
  const [reviewCompany, setReviewCompany] = useState(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [copiedQuoteId, setCopiedQuoteId] = useState(null);
  const [creatingCorrectionQuoteId, setCreatingCorrectionQuoteId] = useState(null);
  const [query, setQuery] = useState(focusSearch ? { page: 1, search: focusSearch } : { page: 1 });
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ ...initialFilters, search: focusSearch });
  const isBusy = isLoading || isLoadingReview || confirmingQuoteId !== null || creatingCorrectionQuoteId !== null;
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
        setReviewQuoteId(null);
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

  const handleReview = useCallback(async (quote) => {
    try {
      setIsLoadingReview(true);
      setReviewError('');
      setReviewQuoteId(null);
      const company = await requestCompany(getAccessTokenSilently);
      setReviewCompany(company);
      setReviewQuoteId(quote.id);
    } catch (requestError) {
      setReviewCompany(null);
      setReviewError(requestError.message);
    } finally {
      setIsLoadingReview(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (!initialReviewRef.current || quotes.length === 0) {
      return;
    }

    const initialReviewQuote = quotes.find((quote) => quote.id === initialReviewRef.current && quote.status === 'DRAFT');
    initialReviewRef.current = null;

    if (initialReviewQuote) {
      handleReview(initialReviewQuote);
    }
  }, [quotes, handleReview]);

  useEffect(() => {
    const targetId = reviewQuoteId ?? highlightQuoteId;

    if (targetId && !isLoading) {
      document.getElementById(`quote-${targetId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [reviewQuoteId, highlightQuoteId, isLoading]);

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

    setHighlightQuoteId(null);
    setQuery({
      ...filters,
      search: filters.search.trim(),
      page: 1,
    });
  }

  function handleClearFilters() {
    setHighlightQuoteId(null);
    setFilters({ ...initialFilters });
    setQuery({ page: 1 });
  }

  function handleRefresh() {
    setRefreshIndex((currentIndex) => currentIndex + 1);
  }
  async function handleConfirm(quote) {
    try {
      setConfirmingQuoteId(quote.id);
      setErrorMessage('');

      await confirmQuote(getAccessTokenSilently, quote.id);

      setReviewQuoteId(null);
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

      const correction = await createQuoteCorrection(getAccessTokenSilently, quote.id);

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
          <label htmlFor="quote-client-search">Buscar por cliente ou nº do orçamento</label>
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

        <div className="list-filter-actions">
          <button type="submit" disabled={isBusy}>
            Buscar
          </button>

          <button type="button" onClick={handleClearFilters} disabled={isBusy}>
            Limpar filtros
          </button>

          <button type="button" onClick={handleRefresh} disabled={isBusy}>
            {isLoading ? 'Atualizando...' : errorMessage ? 'Tentar novamente' : 'Atualizar lista'}
          </button>
        </div>
      </form>

      {isLoading && <p role="status">Carregando orçamentos...</p>}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {reviewError && <p role="alert">{reviewError}</p>}

      {!isLoading && !errorMessage && quotes.length === 0 && <p>Nenhum orçamento encontrado com esses filtros.</p>}

      {!isLoading && !errorMessage && quotes.length > 0 && (
        <ul className="card-grid">
          {quotes.map((quote) => {
            const isConfirming = confirmingQuoteId === quote.id;
            const isCreatingCorrection = creatingCorrectionQuoteId === quote.id;

            const existingCorrection = quote.correction ?? null;

            return (
              <li key={quote.id}>
                <article id={`quote-${quote.id}`} className={reviewQuoteId === quote.id || highlightQuoteId === quote.id ? 'quote-card-reviewing' : undefined}>
                  <h3>Orçamento nº {formatQuoteNumber(quote.quoteNumber)}</h3>
                  {reviewQuoteId === quote.id && <p className="review-badge">Em revisão</p>}
                  {reviewQuoteId !== quote.id && highlightQuoteId === quote.id && <p className="review-badge">Aberto pelo aviso</p>}

                  {quote.status === 'DRAFT' && (
                    <div>
                      {onEdit && (
                        <button type="button" onClick={() => onEdit(quote)} disabled={isBusy}>
                          Editar orçamento
                        </button>
                      )}

                      <button type="button" onClick={() => handleReview(quote)} disabled={isBusy}>
                        {isLoadingReview ? 'Carregando revisão...' : 'Revisar orçamento'}
                      </button>
                    </div>
                  )}
                  {quote.status === 'DRAFT' && reviewQuoteId === quote.id && (
                    <div>
                      <QuoteReview quote={quote} company={reviewCompany} />
                      {!reviewCompany && (
                        <div>
                          <p role="alert">Cadastre seus dados profissionais antes de confirmar o orçamento.</p>
                          {onOpenProfile && <button type="button" className="button-primary" onClick={onOpenProfile}>Preencher perfil</button>}
                        </div>
                      )}
                      <button type="button" className="button-primary" onClick={() => handleConfirm(quote)} disabled={isBusy || !quote.items?.length || !reviewCompany}>
                        {isConfirming ? 'Confirmando...' : 'Confirmar e gerar link'}
                      </button>
                      <button type="button" onClick={() => setReviewQuoteId(null)} disabled={isBusy}>
                        Voltar à lista
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

                      {quote.status === 'SENT' && (
                        <div className="share-actions">
                          {buildWhatsAppShareUrl(quote, buildPublicQuoteUrl(quote.publicToken)) && (
                            <a className="button-link" href={buildWhatsAppShareUrl(quote, buildPublicQuoteUrl(quote.publicToken))} target="_blank" rel="noreferrer">
                              Enviar pelo WhatsApp
                            </a>
                          )}
                          <a className="button-link" href={buildEmailShareUrl(quote, buildPublicQuoteUrl(quote.publicToken))}>
                            Enviar por e-mail
                          </a>
                        </div>
                      )}

                      {quote.status === 'SENT' && !buildWhatsAppShareUrl(quote, buildPublicQuoteUrl(quote.publicToken)) && (
                        <p className="share-hint">
                          O envio pelo WhatsApp só fica disponível quando o telefone do cliente é celular. Use &quot;Copiar link&quot; ou &quot;Enviar por e-mail&quot;.
                        </p>
                      )}
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
                  <QuoteHistory key={refreshIndex} quoteId={quote.id} getAccessTokenSilently={getAccessTokenSilently} />
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
