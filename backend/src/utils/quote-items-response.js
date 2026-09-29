import { calculateItemSubtotal } from './quote-pricing.js';

function serializeQuoteItems(quote) {
  if (!Array.isArray(quote.items)) {
    throw new TypeError('Os itens do orçamento devem estar carregados antes da serialização.');
  }

  if (quote.pricingMode !== 'ITEMIZED' && quote.pricingMode !== 'FIXED_TOTAL') {
    throw new RangeError('A forma de cobrança do orçamento é inválida.');
  }

  const itemized = quote.pricingMode === 'ITEMIZED';

  return [...quote.items]
    .sort((first, second) => first.position - second.position)
    .map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: itemized ? item.unitPrice : null,
      subtotal: itemized ? calculateItemSubtotal(item.quantity, item.unitPrice) : null,
      position: item.position,
    }));
}

export { serializeQuoteItems };
