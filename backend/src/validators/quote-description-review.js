const MAX_ITEMS = 50;

function addError(errors, field, message) {
  errors.push({ field, message });
}

function validateItem(item, index, errors) {
  const prefix = `items[${index}]`;

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    addError(errors, prefix, 'Cada item deve ser um objeto.');
    return;
  }

  for (const property of Object.keys(item)) {
    if (!['description', 'quantity'].includes(property)) {
      addError(errors, `${prefix}.${property}`, 'Este campo não é permitido.');
    }
  }

  if (typeof item.description !== 'string' || item.description.trim().length === 0) {
    addError(errors, `${prefix}.description`, 'Este campo é obrigatório.');
  } else if (item.description.trim().length > 500) {
    addError(errors, `${prefix}.description`, 'Este campo deve possuir no máximo 500 caracteres.');
  }

  if (item.quantity !== undefined && (typeof item.quantity !== 'string' || item.quantity.trim().length > 20)) {
    addError(errors, `${prefix}.quantity`, 'Informe a quantidade como texto com até 20 caracteres.');
  }
}

// Aceita somente a descrição e os itens: dados do cliente nunca chegam ao serviço de IA.
function validateQuoteDescriptionReviewInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [
      {
        field: 'body',
        message: 'O corpo da requisição deve ser um objeto.',
      },
    ];
  }

  for (const property of Object.keys(input)) {
    if (!['description', 'items'].includes(property)) {
      addError(errors, property, 'Este campo não é permitido.');
    }
  }

  if (typeof input.description !== 'string' || input.description.trim().length === 0) {
    addError(errors, 'description', 'Este campo é obrigatório.');
  } else if (input.description.trim().length > 10000) {
    addError(errors, 'description', 'Este campo deve possuir no máximo 10000 caracteres.');
  }

  if (input.items !== undefined) {
    if (!Array.isArray(input.items)) {
      addError(errors, 'items', 'Informe os itens como uma lista.');
    } else if (input.items.length > MAX_ITEMS) {
      addError(errors, 'items', `Informe no máximo ${MAX_ITEMS} itens.`);
    } else {
      input.items.forEach((item, index) => validateItem(item, index, errors));
    }
  }

  return errors;
}

// Para separar em itens, só a descrição é enviada à IA.
function validateQuoteItemSuggestionInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [{ field: 'body', message: 'O corpo da requisição deve ser um objeto.' }];
  }

  const errors = [];

  for (const property of Object.keys(input)) {
    if (property !== 'description') {
      addError(errors, property, 'Este campo não é permitido.');
    }
  }

  if (typeof input.description !== 'string' || input.description.trim().length === 0) {
    addError(errors, 'description', 'Este campo é obrigatório.');
  } else if (input.description.trim().length > 10000) {
    addError(errors, 'description', 'Este campo deve possuir no máximo 10000 caracteres.');
  }

  return errors;
}

export { validateQuoteDescriptionReviewInput, validateQuoteItemSuggestionInput };
