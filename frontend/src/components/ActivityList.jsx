import { useEffect, useState } from 'react';
import { requestActivitiesPage } from '../services/activity.js';
import { describeActivity, formatActivityDate } from '../utils/activity.js';

function ActivityList({ getAccessTokenSilently }) {
  const [pageData, setPageData] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignoreResult = false;

    async function loadActivities() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const result = await requestActivitiesPage(getAccessTokenSilently, { page });

        if (!ignoreResult) {
          setPageData(result);
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

    loadActivities();

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently, page, refreshIndex]);

  return (
    <section aria-labelledby="activity-list-title">
      <h3 id="activity-list-title">Atividades recentes</h3>
      <p>Registro das ações feitas na sua conta sobre clientes e perfil profissional. As ações sobre cada orçamento ficam no histórico do próprio orçamento.</p>

      {isLoading && <p role="status">Carregando atividades...</p>}

      {errorMessage && (
        <>
          <p role="alert">{errorMessage}</p>
          <button type="button" onClick={() => setRefreshIndex((index) => index + 1)}>Tentar novamente</button>
        </>
      )}

      {!isLoading && !errorMessage && pageData?.items.length === 0 && <p>Nenhuma atividade registrada ainda.</p>}

      {!isLoading && !errorMessage && pageData?.items.length > 0 && (
        <>
          <ol className="activity-list">
            {pageData.items.map((activity) => (
              <li key={activity.id}>
                <strong>{describeActivity(activity)}</strong>
                <span> — {formatActivityDate(activity.createdAt)}</span>
              </li>
            ))}
          </ol>

          {pageData.totalPages > 1 && (
            <nav aria-label="Páginas de atividades">
              <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>Mais recentes</button>
              <span> Página {page} de {pageData.totalPages} </span>
              <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= pageData.totalPages}>Mais antigas</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

export default ActivityList;
