import { useEffect, useState } from 'react';

import { requestQuoteHistory } from '../services/quote-history.js';

const eventLabels = {
  CREATED: 'Rascunho criado',
  UPDATED: 'Rascunho alterado',
  CONFIRMED: 'Orçamento confirmado',
  ACCEPTED: 'Cliente aceitou o orçamento',
  REJECTED: 'Cliente recusou o orçamento',
  CORRECTION_CREATED: 'Correção criada',
  CREATED_FROM_CORRECTION: 'Rascunho de correção criado',
};

const fieldLabels = {
  description: 'Descrição',
  pricingMode: 'Forma de cobrança',
  totalAmount: 'Valor total',
  serviceDate: 'Data do serviço',
  serviceAddress: 'Endereço do serviço',
  locationNotes: 'Observações do local',
  items: 'Itens',
};

function formatHistoryValue(field, value) {
  if (value === null || value === undefined || value === '') return 'Não informado';
  if (field === 'pricingMode') return value === 'ITEMIZED' ? 'Preço por item' : 'Valor global';
  if (field === 'totalAmount') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  }
  if (field === 'serviceDate') {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  if (field === 'serviceAddress') {
    return [value.street, value.number, value.complement, value.district, value.city, value.state, value.postalCode]
      .filter(Boolean).join(', ');
  }
  if (field === 'items') {
    return value.map((item) => `${item.description} (quantidade: ${item.quantity}${item.unitPrice ? `, valor unitário: ${formatHistoryValue('totalAmount', item.unitPrice)}` : ''})`).join('; ');
  }
  return String(value);
}

function QuoteHistory({ quoteId, getAccessTokenSilently }) {
  const [isOpen, setIsOpen] = useState(false);
  const [retryIndex, setRetryIndex] = useState(0);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    let ignoreResult = false;
    async function loadHistory() {
      setIsLoading(true);
      setError('');

      try {
        const result = await requestQuoteHistory(getAccessTokenSilently, quoteId);
        if (!ignoreResult) setEvents(result);
      } catch (requestError) {
        if (!ignoreResult) setError(requestError.message);
      } finally {
        if (!ignoreResult) setIsLoading(false);
      }
    }

    loadHistory();
    return () => { ignoreResult = true; };
  }, [getAccessTokenSilently, isOpen, quoteId, retryIndex]);

  return (
    <section aria-label="Histórico do orçamento">
      <button type="button" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? 'Ocultar histórico' : 'Ver histórico'}
      </button>

      {isOpen && (
        <div>
          {isLoading && <p role="status">Carregando histórico...</p>}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setRetryIndex((index) => index + 1)}>Tentar novamente</button>
            </div>
          )}
          {!isLoading && !error && events?.length === 0 && (
            <p>Não há eventos registrados. Alterações anteriores à ativação do histórico não podem ser recuperadas.</p>
          )}
          {!isLoading && !error && events?.length > 0 && (
            <ol>
              {events.map((event) => (
                <li key={event.id}>
                  <strong>{eventLabels[event.type] ?? event.type}</strong>
                  {' — '}
                  <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('pt-BR')}</time>
                  {event.details.rejectionReason && <p>Motivo: {event.details.rejectionReason}</p>}
                  {event.details.correctionQuoteNumber && <p>Orçamento corrigido: nº {String(event.details.correctionQuoteNumber).padStart(6, '0')}</p>}
                  {event.details.originalQuoteNumber && <p>Orçamento original: nº {String(event.details.originalQuoteNumber).padStart(6, '0')}</p>}
                  {event.details.changes?.length > 0 && (
                    <ul>
                      {event.details.changes.map((change) => (
                        <li key={change.field}>
                          <strong>{fieldLabels[change.field] ?? change.field}:</strong>{' '}
                          antes: {formatHistoryValue(change.field, change.before)};{' '}
                          depois: {formatHistoryValue(change.field, change.after)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {event.details.after && (
                    <details>
                      <summary>Dados registrados</summary>
                      <ul>
                        {Object.entries(event.details.after).map(([field, value]) => (
                          <li key={field}>
                            <strong>{fieldLabels[field] ?? field}:</strong> {formatHistoryValue(field, value)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

export default QuoteHistory;
