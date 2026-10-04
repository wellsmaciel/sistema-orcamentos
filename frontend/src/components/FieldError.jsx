// Mensagem de erro logo abaixo do campo, ligada a ele pelo id.
function FieldError({ id, message, announce = false }) {
  if (!message) {
    return null;
  }

  return (
    <p id={`${id}-error`} className="field-error" role={announce ? 'alert' : undefined}>
      {message}
    </p>
  );
}

export default FieldError;
