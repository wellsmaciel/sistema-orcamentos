function validateActivityListInput(query) {
  const errors = [];

  for (const property of Object.keys(query ?? {})) {
    if (property !== 'page') {
      errors.push({ field: property, message: 'Este parâmetro não é permitido.' });
    }
  }

  if (query?.page !== undefined) {
    const page = Number(query.page);

    if (typeof query.page !== 'string' || !/^\d+$/.test(query.page) || page < 1 || page > 1000000) {
      errors.push({ field: 'page', message: 'Informe uma página entre 1 e 1000000.' });
    }
  }

  return errors;
}

export { validateActivityListInput };
