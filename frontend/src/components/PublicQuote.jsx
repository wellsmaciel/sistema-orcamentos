import { useEffect, useState } from 'react';

const statusLabels = {
  SENT: 'Aguardando resposta',
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

async function requestPublicQuote(publicToken) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/quotes/${publicToken}`);

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar o orçamento.');
  }

  return responseBody;
}

function PublicQuote({ publicToken }) {
  const [quote, setQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
  }, [publicToken]);

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
      </main>
    );
  }

  return (
    <main>
      <section>
        <h1>Orçamento nº {formatQuoteNumber(quote.quoteNumber)}</h1>

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
      </section>
    </main>
  );
}

export default PublicQuote;
