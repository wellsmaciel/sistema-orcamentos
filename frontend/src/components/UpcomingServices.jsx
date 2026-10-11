import { useEffect, useState } from 'react';
import { requestUpcomingServices } from '../services/agenda.js';
import { buildGoogleCalendarUrl, describeServiceDay } from '../utils/agenda.js';
import { formatAmount, formatQuoteNumber } from '../utils/format.js';
import { summarizeService } from '../utils/quote-share.js';

// Agenda da tela inicial: os orçamentos aceitos com serviço de hoje em diante, do mais próximo para o mais distante.
function UpcomingServices({ getAccessTokenSilently, onOpenQuote }) {
  const [agenda, setAgenda] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignoreResult = false;

    async function loadAgenda() {
      try {
        const result = await requestUpcomingServices(getAccessTokenSilently);

        if (!ignoreResult) {
          setAgenda(result);
        }
      } catch (requestError) {
        if (!ignoreResult) {
          setErrorMessage(requestError.message);
        }
      }
    }

    loadAgenda();

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently]);

  if (!agenda) {
    return errorMessage ? <p role="alert">{errorMessage}</p> : null;
  }

  const hiddenCount = agenda.total - agenda.items.length;

  return (
    <section className="upcoming-services" aria-labelledby="upcoming-services-title">
      <h2 id="upcoming-services-title">Próximos serviços</h2>

      {agenda.items.length === 0 ? (
        <p>Nenhum serviço agendado. Quando um cliente aceitar um orçamento, o serviço aparece aqui pela data prevista.</p>
      ) : (
        <ul className="upcoming-services-list">
          {agenda.items.map((service) => {
            const day = describeServiceDay(service.serviceDate, agenda.today);
            const summary = summarizeService(service.description);

            return (
              <li key={service.quoteId} className={day === 'Hoje' ? 'upcoming-service-today' : undefined}>
                <strong className={day === 'Hoje' ? 'notification-new upcoming-today-badge' : undefined}>{day}</strong> — {service.clientName}
                {summary && <> — {summary}</>} — {formatAmount(service.totalAmount)}
                <span className="upcoming-service-actions">
                  {onOpenQuote && (
                    <button
                      type="button"
                      className="inline-link-button"
                      onClick={() => onOpenQuote(service)}
                      aria-label={`Abrir orçamento nº ${formatQuoteNumber(service.quoteNumber)}`}
                    >
                      Abrir orçamento
                    </button>
                  )}
                  <a
                    href={buildGoogleCalendarUrl(service)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Adicionar ao Google Agenda: serviço de ${service.clientName}, ${day} (abre em nova aba)`}
                  >
                    Adicionar ao Google Agenda
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="response-notifications-more">
          {hiddenCount === 1 ? 'E mais 1 serviço agendado.' : `E mais ${hiddenCount} serviços agendados.`}
        </p>
      )}
    </section>
  );
}

export default UpcomingServices;
