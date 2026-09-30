import { normalizeStoredQuantity } from './quote-quantity.js';

function snapshotQuote(quote, items = quote.items) {
  if (!Array.isArray(items)) {
    throw new TypeError('Os itens do orçamento devem estar carregados para registrar o histórico.');
  }

  return {
    description: quote.description,
    pricingMode: quote.pricingMode,
    totalAmount: quote.totalAmount,
    serviceDate: quote.serviceDate,
    serviceAddress: {
      street: quote.serviceStreet,
      number: quote.serviceNumber,
      complement: quote.serviceComplement,
      postalCode: quote.servicePostalCode,
      district: quote.serviceDistrict,
      city: quote.serviceCity,
      state: quote.serviceState,
    },
    locationNotes: quote.locationNotes,
    items: [...items]
      .sort((first, second) => first.position - second.position)
      .map((item) => ({
        description: item.description,
        quantity: normalizeStoredQuantity(item.quantity),
        unitPrice: quote.pricingMode === 'ITEMIZED' ? item.unitPrice : null,
      })),
  };
}

function diffQuoteSnapshots(before, after) {
  return Object.keys(after)
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, before: before[field], after: after[field] }));
}

export { snapshotQuote, diffQuoteSnapshots };
