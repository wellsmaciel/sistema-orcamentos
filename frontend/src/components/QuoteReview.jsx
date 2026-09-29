import QuoteItems from './QuoteItems.jsx';

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function QuoteReview({ quote, company }) {
  const address = quote.serviceAddress;

  return (
    <section className="quote-review" aria-labelledby={`quote-review-${quote.id}`}>
      <h4 id={`quote-review-${quote.id}`}>Confira todos os dados antes de confirmar</h4>
      <p>Após a confirmação, o orçamento não poderá mais ser editado e o link público será gerado.</p>
      {company && (
        <section aria-label="Prestador do serviço">
          <h5>Prestador do serviço</h5>
          <p>{company.name} · {company.email} · {company.phone}</p>
          {company.taxId && <p>CPF/CNPJ: {company.taxId}</p>}
          {company.address && (
            <p>{company.address.street}, {company.address.number}{company.address.complement ? `, ${company.address.complement}` : ''} · {company.address.district}, {company.address.city} – {company.address.state} · CEP {company.address.postalCode}</p>
          )}
        </section>
      )}
      <p>
        <strong>Cliente:</strong> {quote.client.name} · {quote.client.email} · {quote.client.phone}
      </p>
      <p>
        <strong>Descrição geral:</strong> {quote.description}
      </p>
      <p>
        <strong>Data do serviço:</strong> {formatDate(quote.serviceDate)}
      </p>
      <p>
        <strong>Endereço do serviço:</strong> {address.street}, {address.number}
        {address.complement ? `, ${address.complement}` : ''} · {address.district}, {address.city} – {address.state} · CEP {address.postalCode}
      </p>
      {quote.locationNotes && (
        <p>
          <strong>Observações do local:</strong> {quote.locationNotes}
        </p>
      )}
      <QuoteItems quote={quote} />
    </section>
  );
}

export default QuoteReview;
