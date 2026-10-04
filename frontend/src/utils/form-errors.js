// Leva o foco ao primeiro campo com erro, na ordem em que os campos aparecem no formulário.
function focusFirstFieldWithError(form, fieldErrors) {
  const firstField = [...(form?.elements ?? [])].find((element) => element.name && fieldErrors[element.name]);

  firstField?.focus();
}

// Atributos de acessibilidade de um campo que pode ter erro: o leitor de tela lê a dica e o erro.
function fieldErrorProps(id, errorMessage, hintId) {
  const errorId = `${id}-error`;
  const describedBy = [hintId, errorMessage ? errorId : null].filter(Boolean).join(' ');

  return {
    'aria-invalid': Boolean(errorMessage),
    'aria-describedby': describedBy || undefined,
    'aria-errormessage': errorMessage ? errorId : undefined,
  };
}

export { fieldErrorProps, focusFirstFieldWithError };
