import { fieldErrorProps } from '../utils/form-errors.js';
import FieldError from './FieldError.jsx';

// Campo de texto com rótulo e erro junto ao campo (borda vermelha, aria-invalid e mensagem abaixo).
function FormField({ id, label, errorMessage = '', ...inputProps }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...inputProps} {...fieldErrorProps(id, errorMessage)} />
      <FieldError id={id} message={errorMessage} />
    </div>
  );
}

export default FormField;
