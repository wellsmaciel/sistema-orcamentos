import Quote from '../../src/models/quote.js';
import QuoteItem from '../../src/models/quote-item.js';

describe('Relacionamento entre orçamento e itens', () => {
  test('um orçamento deve possuir vários itens', () => {
    const association = Quote.associations.items;

    expect(association.associationType).toBe('HasMany');
    expect(association.target).toBe(QuoteItem);
    expect(association.foreignKey).toBe('quoteId');
  });

  test('cada item deve pertencer a um orçamento', () => {
    const association = QuoteItem.associations.quote;

    expect(association.associationType).toBe('BelongsTo');
    expect(association.target).toBe(Quote);
    expect(association.foreignKey).toBe('quoteId');
  });
});
