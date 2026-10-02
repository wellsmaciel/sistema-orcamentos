import { useEffect, useState } from 'react';
import { markResponseNotificationsRead, requestResponseNotifications } from '../services/response-notification.js';
import { countHiddenUnread, describeResponseNotification, formatQuoteNumber } from '../utils/response-notification.js';

// Enquanto o menu está aberto, a lista é atualizada a cada minuto.
const REFRESH_INTERVAL_MS = 60000;

function ResponseNotifications({ getAccessTokenSilently, onOpenQuotes, onOpenQuote, refreshIntervalMs = REFRESH_INTERVAL_MS }) {
  const [notifications, setNotifications] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMarking, setIsMarking] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignoreResult = false;

    async function loadNotifications() {
      try {
        const result = await requestResponseNotifications(getAccessTokenSilently);

        if (!ignoreResult) {
          setNotifications(result);
          setErrorMessage('');
        }
      } catch (requestError) {
        if (!ignoreResult) {
          setErrorMessage(requestError.message);
        }
      }
    }

    loadNotifications();
    const intervalId = setInterval(loadNotifications, refreshIntervalMs);

    return () => {
      ignoreResult = true;
      clearInterval(intervalId);
    };
  }, [getAccessTokenSilently, refreshIntervalMs, refreshIndex]);

  async function handleMarkAsRead() {
    try {
      setIsMarking(true);
      await markResponseNotificationsRead(getAccessTokenSilently);
      setRefreshIndex((index) => index + 1);
    } catch (requestError) {
      setErrorMessage(requestError.message);
    } finally {
      setIsMarking(false);
    }
  }

  // Sem respostas ainda, o menu fica limpo; uma falha só aparece se não houver nada para mostrar.
  if (!notifications || notifications.items.length === 0) {
    return errorMessage ? <p role="alert">{errorMessage}</p> : null;
  }

  const { unreadCount, items } = notifications;
  const hiddenUnread = countHiddenUnread(notifications);

  return (
    <section className={unreadCount > 0 ? 'response-notifications has-unread' : 'response-notifications'} aria-labelledby="response-notifications-title">
      <h2 id="response-notifications-title">
        Respostas dos clientes
        {unreadCount > 0 && <span className="notification-badge">{unreadCount === 1 ? '1 nova' : `${unreadCount} novas`}</span>}
      </h2>

      <ul className="response-notification-list">
        {items.map((item) => (
          <li key={item.quoteId}>
            {item.unread && <span className="notification-new">Nova</span>} {describeResponseNotification(item)}
            {onOpenQuote && (
              <>
                {' '}
                <button
                  type="button"
                  className="inline-link-button"
                  onClick={() => onOpenQuote(item)}
                  aria-label={`Abrir orçamento nº ${formatQuoteNumber(item.quoteNumber)}`}
                >
                  Abrir orçamento
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {hiddenUnread > 0 && (
        <p className="response-notifications-more">
          {hiddenUnread === 1 ? 'E mais 1 resposta nova' : `E mais ${hiddenUnread} respostas novas`} em &quot;Ver orçamentos&quot;.
        </p>
      )}

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <div className="description-review-actions">
        <button type="button" className="button-primary" onClick={onOpenQuotes}>Ver orçamentos</button>
        {unreadCount > 0 && (
          <button type="button" onClick={handleMarkAsRead} disabled={isMarking}>
            {isMarking ? 'Marcando...' : 'Marcar como vistas'}
          </button>
        )}
      </div>
    </section>
  );
}

export default ResponseNotifications;
