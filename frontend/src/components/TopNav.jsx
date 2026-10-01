const NAV_ITEMS = [
  { view: 'home', label: 'Início' },
  { view: 'quotes', label: 'Orçamentos' },
  { view: 'new-quote', label: 'Novo orçamento' },
  { view: 'clients', label: 'Clientes' },
  { view: 'management', label: 'Gestão' },
  { view: 'company', label: 'Perfil' },
  { view: 'account', label: 'Minha conta' },
];

// Telas internas destacam a seção a que pertencem.
const SECTION_BY_VIEW = {
  'edit-quote': 'quotes',
  'new-client': 'clients',
  'edit-client': 'clients',
};

// Navegação fixa para telas grandes. No celular ela fica oculta pelo CSS e o menu inicial continua sendo o caminho.
function TopNav({ currentView, onNavigate, onLogout }) {
  const activeSection = SECTION_BY_VIEW[currentView] ?? currentView;

  return (
    <nav className="top-nav" aria-label="Navegação principal">
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.view}>
            <button
              type="button"
              className={activeSection === item.view ? 'top-nav-active' : undefined}
              aria-current={activeSection === item.view ? 'page' : undefined}
              onClick={() => onNavigate(item.view)}
            >
              {item.label}
            </button>
          </li>
        ))}
        <li className="top-nav-logout">
          <button type="button" onClick={onLogout}>Sair</button>
        </li>
      </ul>
    </nav>
  );
}

export default TopNav;
