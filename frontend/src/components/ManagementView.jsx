import { useEffect, useState } from 'react';
import { requestManagementSummary } from '../services/management.js';
import { PERIOD_OPTIONS, STATUS_ROWS, formatAcceptanceRate, formatDaysWaiting, formatResponseTime } from '../utils/management.js';
import { formatQuoteMoney } from '../utils/quote-form.js';

function formatQuoteNumber(quoteNumber) {
  return String(quoteNumber).padStart(6, '0');
}

function ManagementView({ getAccessTokenSilently, onOpenQuotes }) {
  const [period, setPeriod] = useState('month');
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignoreResult = false;

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const result = await requestManagementSummary(getAccessTokenSilently, { period });

        if (!ignoreResult) {
          setSummary(result);
        }
      } catch (requestError) {
        if (!ignoreResult) {
          setErrorMessage(requestError.message);
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently, period, refreshIndex]);

  const largestStatusCount = summary ? Math.max(1, ...STATUS_ROWS.map(({ status }) => summary.statusCounts[status])) : 1;

  return (
    <section aria-labelledby="management-title">
      <h2 id="management-title">Gestão</h2>
      <p>Acompanhe seus orçamentos e o resultado do período. Correções contam como um orçamento novo; o original continua como recusado.</p>

      <div>
        <label htmlFor="management-period">Período</label>
        <select id="management-period" value={period} onChange={(event) => setPeriod(event.target.value)} disabled={isLoading}>
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {isLoading && <p role="status">Carregando indicadores...</p>}

      {errorMessage && (
        <>
          <p role="alert">{errorMessage}</p>
          <button type="button" onClick={() => setRefreshIndex((index) => index + 1)}>Tentar novamente</button>
        </>
      )}

      {!isLoading && !errorMessage && summary && (
        <>
          <ul className="management-cards" aria-label="Indicadores do período">
            <li><span>Orçamentos criados</span><strong>{summary.totalQuotes}</strong></li>
            <li><span>Taxa de aceite</span><strong>{formatAcceptanceRate(summary.acceptanceRate)}</strong></li>
            <li><span>Valor aceito</span><strong>{formatQuoteMoney(summary.acceptedAmount)}</strong></li>
            <li><span>Valor em aberto</span><strong>{formatQuoteMoney(summary.openAmount)}</strong></li>
            <li><span>Tempo médio de resposta do cliente</span><strong>{formatResponseTime(summary.averageResponseHours)}</strong></li>
          </ul>

          <h3>Orçamentos por situação</h3>
          <ul className="status-bars">
            {STATUS_ROWS.map(({ status, label }) => (
              <li key={status}>
                <span className="status-bar-label">{label}: {summary.statusCounts[status]}</span>
                <span className="status-bar-track" aria-hidden="true">
                  <span className={`status-bar-fill status-${status.toLowerCase()}`} style={{ width: `${(summary.statusCounts[status] / largestStatusCount) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>

          <h3>Aguardando resposta há mais tempo</h3>
          {summary.awaitingResponse.length === 0 ? (
            <p>Nenhum orçamento aguardando resposta.</p>
          ) : (
            <ul className="management-list">
              {summary.awaitingResponse.map((item) => (
                <li key={item.quoteId}>
                  Orçamento nº {formatQuoteNumber(item.quoteNumber)} — {item.clientName} — {formatQuoteMoney(item.totalAmount)} — {formatDaysWaiting(item.daysWaiting)}
                </li>
              ))}
            </ul>
          )}

          <h3>Principais clientes no período</h3>
          {summary.topClients.length === 0 ? (
            <p>Nenhum orçamento aceito no período.</p>
          ) : (
            <ol className="management-list">
              {summary.topClients.map((client) => (
                <li key={client.clientId}>
                  {client.clientName} — {formatQuoteMoney(client.acceptedAmount)} ({client.acceptedCount === 1 ? '1 orçamento aceito' : `${client.acceptedCount} orçamentos aceitos`})
                </li>
              ))}
            </ol>
          )}

          {onOpenQuotes && <button type="button" className="button-primary" onClick={onOpenQuotes}>Ver orçamentos</button>}
        </>
      )}
    </section>
  );
}

export default ManagementView;
