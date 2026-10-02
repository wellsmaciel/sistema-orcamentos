// O navegador mostra os avisos de campo inválido no idioma dele ("Please fill in this field."),
// não no idioma do site. Aqui eles são trocados por frases em português, em todos os formulários.
function describeInvalidField(field) {
  const { validity } = field;

  if (validity.valueMissing) {
    return field.tagName === 'SELECT' ? 'Escolha uma opção.' : 'Preencha este campo.';
  }

  if (validity.typeMismatch && field.type === 'email') {
    return 'Informe um e-mail válido, por exemplo nome@exemplo.com.';
  }

  if (validity.patternMismatch) {
    return field.title || 'Use o formato pedido.';
  }

  if (validity.tooShort) {
    return `Use pelo menos ${field.minLength} caracteres.`;
  }

  if (validity.tooLong) {
    return `Use no máximo ${field.maxLength} caracteres.`;
  }

  if (validity.rangeUnderflow) {
    return field.type === 'date' ? 'Escolha uma data a partir do mínimo permitido.' : `Informe um valor a partir de ${field.min}.`;
  }

  if (validity.rangeOverflow) {
    return field.type === 'date' ? 'Escolha uma data até o máximo permitido.' : `Informe um valor até ${field.max}.`;
  }

  if (validity.badInput) {
    return field.type === 'date' ? 'Informe uma data completa.' : 'Informe um valor válido.';
  }

  if (validity.typeMismatch || validity.stepMismatch) {
    return 'Informe um valor válido.';
  }

  return '';
}

function clearFormMessages(form) {
  for (const field of form.elements) {
    field.setCustomValidity?.('');
  }
}

function installPortugueseValidation(root = document) {
  // Antes de cada envio, as mensagens antigas são apagadas para o navegador validar de novo os valores atuais,
  // inclusive os preenchidos por botões (como "Usar sugestão"), que não disparam o evento de digitação.
  root.addEventListener('click', (event) => {
    const button = event.target.closest?.('button, input[type="submit"]');

    if (button?.form && button.type === 'submit') {
      clearFormMessages(button.form);
    }
  }, true);

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.form) {
      clearFormMessages(event.target.form);
    }
  }, true);

  root.addEventListener('invalid', (event) => {
    const field = event.target;
    field.setCustomValidity('');
    field.setCustomValidity(describeInvalidField(field));
  }, true);

  for (const eventName of ['input', 'change']) {
    root.addEventListener(eventName, (event) => {
      event.target.setCustomValidity?.('');
    }, true);
  }
}

export { describeInvalidField, installPortugueseValidation };
