import useAppNavigation, { clearNavigationHistory } from '../src/hooks/useAppNavigation.js';

const PARENT_VIEW = { 'edit-quote': 'quotes', 'new-client': 'clients', 'edit-client': 'clients' };

// Imita a navegação do App com o mesmo hook, para testar o botão Voltar do navegador.
function NavigationFixture({ owner }) {
  const { navigation, navigate, goBackTo } = useAppNavigation(owner);
  const editedQuote = { id: 'q7', quoteNumber: 7, client: { name: 'Maria Cliente', email: 'maria@example.com', phone: '(11) 99999-8888' } };

  return (
    <main>
      <h2>Tela: {navigation.view}</h2>
      {navigation.selectedQuote && <p>Editando orçamento {navigation.selectedQuote.quoteNumber}</p>}
      {navigation.focusQuote && <p>Destaque: orçamento {navigation.focusQuote.quoteNumber}</p>}
      <button type="button" onClick={() => navigate({ view: 'quotes' })}>Ir para orçamentos</button>
      <button type="button" onClick={() => navigate({ view: 'clients' })}>Ir para clientes</button>
      <button type="button" onClick={() => navigate({ view: 'new-client' })}>Novo cliente</button>
      <button type="button" onClick={() => navigate({ view: 'edit-quote', selectedQuote: editedQuote })}>Editar orçamento 7</button>
      <button
        type="button"
        onClick={() => navigate({ view: 'quotes', focusQuote: { quoteId: 'q7', quoteNumber: 7 } }, { replace: true })}
      >
        Salvar edição
      </button>
      <button type="button" onClick={() => goBackTo(PARENT_VIEW[navigation.view] ?? 'home')}>Cancelar</button>
      <button type="button" onClick={clearNavigationHistory}>Sair</button>
    </main>
  );
}

export default NavigationFixture;
