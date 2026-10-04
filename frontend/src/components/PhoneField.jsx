import { fieldErrorProps } from '../utils/form-errors.js';
import { PHONE_EXAMPLE, standardizeBrazilianPhone } from '../utils/phone.js';
import FieldError from './FieldError.jsx';

// Campo de telefone com DDD: ao sair do campo, um número válido é exibido no formato padrão.
function PhoneField({ id, label, value, onChange, hint, errorMessage = '', announceError = true }) {
  const helpId = `${id}-help`;

  function handleBlur() {
    const standardizedPhone = standardizeBrazilianPhone(value);

    if (standardizedPhone && standardizedPhone !== value) {
      onChange({ target: { name: 'phone', value: standardizedPhone } });
    }
  }

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        maxLength={30}
        {...fieldErrorProps(id, errorMessage, helpId)}
        required
      />
      <p id={helpId}>Você pode digitar somente números, incluindo o DDD, por exemplo {PHONE_EXAMPLE}. O formato será ajustado automaticamente. {hint}</p>
      <FieldError id={id} message={errorMessage} announce={announceError} />
    </div>
  );
}

export default PhoneField;
