import { useEffect, useState } from 'react';

import { requestClientsPage, deleteClient, deactivateClient, reactivateClient } from '../services/client.js';

const actionLabels = {
  delete: 'excluir',
  deactivate: 'inativar',
  reactivate: 'reativar',
};

const successLabels = {
  delete: 'excluído',
  deactivate: 'inativado',
  reactivate: 'reativado',
};

function ClientList({ getAccessTokenSilently, onEdit, onNewClient }) {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('true');
  const [query, setQuery] = useState({
    active: true,
    search: '',
    page: 1,
  });
  const [pageData, setPageData] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const isBusy = isLoading || isProcessing;
  const controlsDisabled = isBusy || pendingAction !== null;

  useEffect(() => {
    let ignoreResult = false;

    async function loadClients() {
      setIsLoading(true);
      setListError('');
      setPageData(null);

      try {
        const result = await requestClientsPage(getAccessTokenSilently, query);

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

        setPageData(result);
      } catch (requestError) {
        if (!ignoreResult) {
          setListError(requestError.message);
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently, query, refreshIndex]);

  function handleSearch(event) {
    event.preventDefault();

    setActionMessage('');
    setQuery({
      active: statusFilter === 'true',
      search: searchText.trim(),
      page: 1,
    });
  }

  function handleSelectAction(client, type) {
    setPendingAction({ client, type });
    setActionError('');
    setActionMessage('');
  }

  function handleCancelAction() {
    setPendingAction(null);
    setActionError('');
  }

  async function handleConfirmAction() {
    if (!pendingAction || isProcessing) {
      return;
    }

    const { client, type } = pendingAction;

    try {
      setIsProcessing(true);
      setActionError('');

      if (type === 'delete') {
        await deleteClient(getAccessTokenSilently, client.id);
      } else if (type === 'deactivate') {
        await deactivateClient(getAccessTokenSilently, client.id);
      } else {
        await reactivateClient(getAccessTokenSilently, client.id);
      }

      setPendingAction(null);
      setActionMessage(`Cliente ${client.name} ${successLabels[type]} com sucesso.`);
      setRefreshIndex((currentIndex) => currentIndex + 1);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleChangePage(page) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      page,
    }));
  }

  return (
    <section>
      <button type="button" className="button-primary" onClick={onNewClient} disabled={controlsDisabled}>
        Novo cliente
      </button>

      <form onSubmit={handleSearch}>
        <div>
          <label htmlFor="client-search">Buscar por nome</label>
          <input id="client-search" type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} maxLength={150} disabled={controlsDisabled} />
        </div>

        <div>
          <label htmlFor="client-status">Situação</label>
          <select id="client-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={controlsDisabled}>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>

        <button type="submit" disabled={controlsDisabled}>
          Buscar
        </button>
      </form>

      <button type="button" onClick={() => setRefreshIndex((index) => index + 1)} disabled={controlsDisabled}>
        {isLoading ? 'Atualizando...' : listError ? 'Tentar novamente' : 'Atualizar lista'}
      </button>

      {isLoading && <p role="status">Carregando clientes...</p>}
      {listError && <p role="alert">{listError}</p>}
      {actionMessage && <p role="status">{actionMessage}</p>}

      {!isLoading && pageData && (
        <>
          <p>
            {pageData.total} cliente(s) encontrado(s) — {query.active ? 'ativos' : 'inativos'}.
          </p>

          {pageData.items.length === 0 && <p>Nenhum cliente encontrado com esses filtros.</p>}

          <ul className="card-grid">
            {pageData.items.map((client) => (
              <li key={client.id} className="client-card">
                <strong>{client.name}</strong>
                <p>{client.email}</p>
                <p>{client.active ? 'Ativo' : 'Inativo'}</p>

                <button type="button" onClick={() => onEdit(client)} disabled={controlsDisabled}>
                  Editar cliente
                </button>

                <button type="button" className="button-danger" onClick={() => handleSelectAction(client, 'delete')} disabled={controlsDisabled}>
                  Excluir cliente
                </button>

                <button type="button" onClick={() => handleSelectAction(client, client.active ? 'deactivate' : 'reactivate')} disabled={controlsDisabled}>
                  {client.active ? 'Inativar cliente' : 'Reativar cliente'}
                </button>

                {pendingAction?.client.id === client.id && (
                  <section aria-label="Confirmar ação sobre o cliente">
                    <p>
                      Deseja {actionLabels[pendingAction.type]} {client.name}?
                    </p>

                    {pendingAction.type === 'delete' && <p>A exclusão é permanente e só é permitida para clientes sem orçamentos vinculados.</p>}

                    {pendingAction.type === 'deactivate' && <p>O histórico será preservado. O cliente deixará de estar disponível para novos orçamentos.</p>}

                    {pendingAction.type === 'reactivate' && <p>O cliente voltará a estar disponível para novos orçamentos.</p>}

                    {actionError && <p role="alert">{actionError}</p>}

                    <button type="button" className={pendingAction.type === 'delete' ? 'button-danger' : 'button-primary'} onClick={handleConfirmAction} disabled={isBusy}>
                      {isProcessing ? 'Processando...' : 'Confirmar'}
                    </button>

                    <button type="button" onClick={handleCancelAction} disabled={isBusy}>
                      Cancelar
                    </button>
                  </section>
                )}
              </li>
            ))}
          </ul>

          {pageData.totalPages > 1 && (
            <nav aria-label="Páginas de clientes">
              <button type="button" onClick={() => handleChangePage(query.page - 1)} disabled={controlsDisabled || query.page === 1}>
                Anterior
              </button>

              <span>
                {' '}
                Página {query.page} de {pageData.totalPages}{' '}
              </span>

              <button type="button" onClick={() => handleChangePage(query.page + 1)} disabled={controlsDisabled || query.page >= pageData.totalPages}>
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

export default ClientList;
