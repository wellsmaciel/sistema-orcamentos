function formatAmount(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function QuoteItems({ quote }) {
  const items = [...(quote.items ?? [])].sort((first, second) => first.position - second.position);
  const itemized = quote.pricingMode === 'ITEMIZED';

  return (
    <section aria-labelledby="quote-items-title">
      <h2 id="quote-items-title">Itens do orçamento</h2>
      <p>
        <strong>Forma de cobrança:</strong> {itemized ? 'Preço por item' : 'Valor global'}
      </p>

      {items.length === 0 ? (
        <p>Este orçamento anterior não possui itens discriminados.</p>
      ) : (
        <ol className="quote-item-list">
          {items.map((item) => (
            <li key={item.id ?? item.position}>
              <strong>{item.description}</strong>
              <span>Quantidade: {String(item.quantity).replace('.', ',')}</span>
              {itemized && (
                <span>
                  Valor unitário: {formatAmount(item.unitPrice)} · Subtotal: {formatAmount(item.subtotal)}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      <p>
        <strong>Valor total:</strong> {formatAmount(quote.totalAmount)}
      </p>
    </section>
  );
}

export default QuoteItems;
