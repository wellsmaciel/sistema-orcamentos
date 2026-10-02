// Aceita o número como aparece na tela ("002572"), sem zeros ("2572") ou com prefixo ("nº 2572", "#2572").
// Até 9 dígitos, para caber na coluna inteira do banco.
const QUOTE_NUMBER_SEARCH_PATTERN = /^(?:n\s*[º°o.]?\s*|#\s*)?(\d{1,9})$/i;

function parseQuoteNumberSearch(search) {
  if (typeof search !== 'string') {
    return null;
  }

  const match = search.trim().match(QUOTE_NUMBER_SEARCH_PATTERN);
  const quoteNumber = match ? Number(match[1]) : null;

  return quoteNumber > 0 ? quoteNumber : null;
}

export { parseQuoteNumberSearch };
