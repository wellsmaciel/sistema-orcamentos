import { useEffect, useState } from 'react';
import QuoteItems from './QuoteItems.jsx';
import { fetchJsonWithTimeout } from '../services/request.js';

const statusLabels = {
  SENT: 'Aguardando resposta',
  ACCEPTED: 'Aceito pelo cliente',
  REJECTED: 'Recusado pelo cliente',
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

async function requestPublicQuote(publicToken) {
  const { response, responseBody } = await fetchJsonWithTimeout(`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/quotes/${publicToken}`);

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar o orçamento.');
  }

  return responseBody;
}

async function requestQuoteResponse(publicToken, decision, reason) {
  const requestBody = {
    decision,
  };

  if (decision === 'REJECTED') {
    requestBody.reason = reason;
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/quotes/${publicToken}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível registrar a resposta.');
  }

  return responseBody;
}

function PublicQuote({ publicToken }) {
  const [quote, setQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingDecision, setPendingDecision] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseError, setResponseError] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [hasLogoError, setHasLogoError] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    requestPublicQuote(publicToken)
      .then((responseBody) => {
        if (!isCancelled) {
          setQuote(responseBody);
          setErrorMessage('');
        }
      })
      .catch((requestError) => {
        if (!isCancelled) {
          setQuote(null);
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
  }, [publicToken, refreshIndex]);

  async function handleSubmitResponse() {
    if (!pendingDecision) {
      return;
    }

    try {
      setIsSubmitting(true);
      setResponseError('');
      setResponseMessage('');

      const updatedQuote = await requestQuoteResponse(publicToken, pendingDecision, rejectionReason);

      setQuote(updatedQuote);
      setResponseMessage(pendingDecision === 'ACCEPTED' ? 'Orçamento aceito com sucesso.' : 'Recusa registrada com sucesso.');
      setPendingDecision(null);
      setRejectionReason('');
    } catch (requestError) {
      setResponseError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelResponse() {
    setPendingDecision(null);
    setRejectionReason('');
    setResponseError('');
  }

  if (isLoading) {
    return (
      <main>
        <p role="status">Carregando orçamento...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main>
        <h1>Orçamento</h1>
        <p role="alert">{errorMessage}</p>
        <button type="button" onClick={() => {
          setIsLoading(true);
          setRefreshIndex((index) => index + 1);
        }}>Tentar novamente</button>
      </main>
    );
  }

  return (
    <main>
      <section>
        {/* O logo atual da empresa; se a imagem falhar, o orçamento continua legível sem ele. */}
        {quote.hasProviderLogo && !hasLogoError && (
          <img
            className="public-quote-logo"
            src={`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/quotes/${publicToken}/logo`}
            alt={quote.provider ? `Logo de ${quote.provider.name}` : 'Logo do prestador'}
            onError={() => setHasLogoError(true)}
          />
        )}
        <h1>Orçamento nº {formatQuoteNumber(quote.quoteNumber)}</h1>
        {quote.provider && (
          <section aria-labelledby="quote-provider-title">
            <h2 id="quote-provider-title">Prestador do serviço</h2>

            <p>
              <strong>{quote.provider.name}</strong>
            </p>

            <p>
              <strong>E-mail:</strong> {quote.provider.email}
            </p>

            <p>
              <strong>Telefone:</strong> {quote.provider.phone}
            </p>

            {quote.provider.taxId && (
              <p>
                <strong>CPF/CNPJ:</strong> {quote.provider.taxId}
              </p>
            )}

            {quote.provider.address && (
              <>
                <p>
                  {quote.provider.address.street}, {quote.provider.address.number}
                  {quote.provider.address.complement ? `, ${quote.provider.address.complement}` : ''}
                </p>

                <p>
                  {quote.provider.address.district}, {quote.provider.address.city} – {quote.provider.address.state}
                </p>

                <p>CEP {quote.provider.address.postalCode}</p>
              </>
            )}
          </section>
        )}
        <p>
          Preparado para <strong>{quote.clientName}</strong>.
        </p>

        <p>
          <strong>Situação:</strong> {statusLabels[quote.status] ?? quote.status}
        </p>

        <p>
          <strong>Valor:</strong> {formatAmount(quote.totalAmount)}
        </p>

        <p>
          <strong>Data prevista do serviço:</strong> {formatDate(quote.serviceDate)}
        </p>

        <section>
          <h2>Descrição</h2>
          <p>{quote.description}</p>
        </section>

        <QuoteItems quote={quote} />

        <section>
          <h2>Endereço do serviço</h2>

          <p>
            {quote.serviceAddress.street}, {quote.serviceAddress.number}
            {quote.serviceAddress.complement ? `, ${quote.serviceAddress.complement}` : ''}
          </p>

          <p>
            {quote.serviceAddress.district}, {quote.serviceAddress.city} – {quote.serviceAddress.state}
          </p>

          <p>CEP {quote.serviceAddress.postalCode}</p>
        </section>

        {quote.locationNotes && (
          <section>
            <h2>Observações do local</h2>
            <p>{quote.locationNotes}</p>
          </section>
        )}

        {quote.rejectionReason && (
          <section>
            <h2>Motivo da recusa</h2>
            <p>{quote.rejectionReason}</p>
          </section>
        )}

        {responseMessage && <p role="status">{responseMessage}</p>}

        {responseError && <p role="alert">{responseError}</p>}

        {quote.status === 'SENT' && !pendingDecision && (
          <section aria-labelledby="quote-response-title">
            <h2 id="quote-response-title">Responder ao orçamento</h2>

            <button type="button" className="button-primary" onClick={() => setPendingDecision('ACCEPTED')}>
              Aceitar orçamento
            </button>

            <button type="button" className="button-danger" onClick={() => setPendingDecision('REJECTED')}>
              Recusar orçamento
            </button>
          </section>
        )}

        {pendingDecision === 'ACCEPTED' && (
          <section aria-labelledby="accept-quote-title">
            <h2 id="accept-quote-title">Confirmar aceitação</h2>
            <p>Deseja aceitar este orçamento? Essa decisão não poderá ser alterada pelo link.</p>

            <button type="button" className="button-primary" onClick={handleSubmitResponse} disabled={isSubmitting}>
              {isSubmitting ? 'Confirmando...' : 'Confirmar aceitação'}
            </button>

            <button type="button" onClick={handleCancelResponse} disabled={isSubmitting}>
              Cancelar
            </button>
          </section>
        )}

        {pendingDecision === 'REJECTED' && (
          <section aria-labelledby="reject-quote-title">
            <h2 id="reject-quote-title">Recusar orçamento</h2>

            <label htmlFor="rejection-reason">Motivo da recusa (opcional)</label>

            <textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={2000} />

            <button type="button" className="button-danger" onClick={handleSubmitResponse} disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Confirmar recusa'}
            </button>

            <button type="button" onClick={handleCancelResponse} disabled={isSubmitting}>
              Cancelar
            </button>
          </section>
        )}
      </section>

      <p className="public-quote-credit">
        <img src="/logo-auth0.png" alt="" width="29" height="16" />
        Orçamento gerado com Sistema de Orçamentos
      </p>
    </main>
  );
}

export default PublicQuote;
