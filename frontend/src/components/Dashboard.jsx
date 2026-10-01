function Dashboard({ onNavigate }) {
  return (
    <section className="dashboard-menu" aria-labelledby="dashboard-title">
      <h2 id="dashboard-title">O que você deseja fazer?</h2>
      <p>Escolha uma opção para continuar.</p>

      <nav className="dashboard-actions" aria-label="Menu principal">
        <button type="button" onClick={() => onNavigate('new-quote')}>
          Novo orçamento
        </button>

        <button type="button" onClick={() => onNavigate('quotes')}>
          Meus orçamentos
        </button>

        <button type="button" onClick={() => onNavigate('clients')}>
          Clientes
        </button>

        <button type="button" onClick={() => onNavigate('management')}>
          Gestão
        </button>

        <button type="button" onClick={() => onNavigate('company')}>
          Perfil profissional
        </button>

        <button type="button" onClick={() => onNavigate('account')}>
          Minha conta
        </button>
      </nav>
    </section>
  );
}

export default Dashboard;
