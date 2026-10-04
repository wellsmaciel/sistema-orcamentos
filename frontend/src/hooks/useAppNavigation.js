import { useCallback, useEffect, useRef, useState } from 'react';

const HOME = {
  view: 'home',
  previousView: null,
  selectedQuote: null,
  selectedClient: null,
  reviewQuoteId: null,
  focusQuote: null,
  createdClient: null,
  quoteClientId: null,
  key: 0,
};

const VIEWS = ['home', 'quotes', 'new-quote', 'edit-quote', 'clients', 'new-client', 'edit-client', 'management', 'company', 'account'];

// Dados completos (orçamento, cliente) ficam só na memória desta página, nunca no histórico do navegador,
// que permanece na aba mesmo depois de sair da conta.
const detailsByKey = new Map();

// O que vai para o histórico: a tela, de onde se veio, identificadores e a conta dona da entrada. Nenhum dado pessoal.
function toHistoryState(entry, owner) {
  return {
    owner,
    key: entry.key,
    view: entry.view,
    previousView: entry.previousView,
    reviewQuoteId: entry.reviewQuoteId,
    quoteClientId: entry.quoteClientId,
    focusQuote: entry.focusQuote
      ? { quoteId: entry.focusQuote.quoteId, quoteNumber: entry.focusQuote.quoteNumber, highlight: entry.focusQuote.highlight }
      : null,
  };
}

// Reconstrói a tela a partir do histórico. Entradas de outra conta, inválidas ou sem os dados de uma edição
// (por exemplo, depois de recarregar) levam ao Início ou à lista correspondente.
function restoreNavigation(state, owner) {
  if (!state || !owner || state.owner !== owner || !VIEWS.includes(state.view)) {
    return HOME;
  }

  const details = detailsByKey.get(state.key) ?? {};
  const entry = {
    ...HOME,
    key: state.key,
    view: state.view,
    previousView: VIEWS.includes(state.previousView) ? state.previousView : null,
    reviewQuoteId: state.reviewQuoteId ?? null,
    quoteClientId: state.quoteClientId ?? null,
    focusQuote: state.focusQuote ?? null,
    selectedQuote: details.selectedQuote ?? null,
    selectedClient: details.selectedClient ?? null,
    createdClient: details.createdClient ?? null,
  };

  if (entry.view === 'edit-quote' && !entry.selectedQuote) {
    return { ...entry, view: 'quotes' };
  }

  if (entry.view === 'edit-client' && !entry.selectedClient) {
    return { ...entry, view: 'clients' };
  }

  return entry;
}

function createEntry(next, previousView) {
  const key = Date.now() + Math.random();
  const entry = VIEWS.includes(next.view) ? { ...HOME, ...next, previousView, key } : { ...HOME, previousView, key };

  detailsByKey.set(key, { selectedQuote: entry.selectedQuote, selectedClient: entry.selectedClient, createdClient: entry.createdClient });

  return entry;
}

// Ao sair da conta, apaga a tela guardada na entrada atual, preservando o resto do estado do histórico.
function clearNavigationHistory() {
  const { appNavigation: _appNavigation, ...otherState } = window.history.state ?? {};

  window.history.replaceState(otherState, '');
  detailsByKey.clear();
}

// O app troca de tela sem mudar de endereço. Cada troca vira uma entrada no histórico do navegador,
// então o botão Voltar (do navegador ou do celular) volta para a tela anterior do app, em vez de sair dele.
// owner é o identificador da conta logada: o histórico de outra conta, na mesma aba, nunca é restaurado.
function useAppNavigation(owner) {
  // Ao recarregar a página, continua na mesma tela.
  const [navigation, setNavigation] = useState(() => restoreNavigation(window.history.state?.appNavigation, owner));
  const currentRef = useRef(navigation);

  function show(entry) {
    currentRef.current = entry;
    setNavigation(entry);
  }

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, appNavigation: toHistoryState(currentRef.current, owner) }, '');

    function handlePopState(event) {
      const entry = restoreNavigation(event.state?.appNavigation, owner);
      currentRef.current = entry;
      setNavigation(entry);
    }

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [owner]);

  // replace: true troca a entrada atual em vez de criar outra. É usado depois de salvar, para o Voltar
  // não reabrir um formulário com dados antigos.
  const navigate = useCallback((next, { replace = false } = {}) => {
    const current = currentRef.current;
    const entry = createEntry(next, replace ? current.previousView : current.view);

    window.history[replace ? 'replaceState' : 'pushState']({ ...(replace ? window.history.state : {}), appNavigation: toHistoryState(entry, owner) }, '');
    show(entry);
  }, [owner]);

  // Sai de uma tela de volta para a tela "pai" sem criar entrada nova: se a anterior no histórico é essa tela,
  // volta para ela (como o Voltar do navegador); se não, troca a entrada atual. Assim um formulário cancelado
  // não reabre com o Voltar, e o app nunca é deixado sem querer.
  const goBackTo = useCallback((view) => {
    if (currentRef.current.previousView === view) {
      window.history.back();
      return;
    }

    navigate({ view }, { replace: true });
  }, [navigate]);

  return { navigation, navigate, goBackTo };
}

export default useAppNavigation;
export { clearNavigationHistory, restoreNavigation, toHistoryState };
