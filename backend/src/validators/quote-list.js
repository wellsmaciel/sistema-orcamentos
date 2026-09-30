const allowedStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) === 0) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateQuoteListInput(query) {
  const errors = [];

  const { page = '1', search = '', status = '', serviceDateFrom = '', serviceDateTo = '' } = query;

  const pageNumber = Number(page);

  if (typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(pageNumber) || pageNumber > 1000000) {
    errors.push({
      field: 'page',
      message: 'Informe uma página entre 1 e 1000000.',
    });
  }

  if (typeof search !== 'string' || search.trim().length > 150) {
    errors.push({
      field: 'search',
      message: 'A busca deve ser um texto com até 150 caracteres.',
    });
  }

  if (status !== '' && !allowedStatuses.includes(status)) {
    errors.push({
      field: 'status',
      message: 'Informe uma situação de orçamento válida.',
    });
  }

  for (const [field, value] of [
    ['serviceDateFrom', serviceDateFrom],
    ['serviceDateTo', serviceDateTo],
  ]) {
    if (value !== '' && !isValidDate(value)) {
      errors.push({
        field,
        message: 'Informe uma data válida no formato AAAA-MM-DD.',
      });
    }
  }

  if (isValidDate(serviceDateFrom) && isValidDate(serviceDateTo) && serviceDateFrom > serviceDateTo) {
    errors.push({
      field: 'serviceDateTo',
      message: 'A data final não pode ser anterior à data inicial.',
    });
  }

  return errors;
}

export { validateQuoteListInput };
