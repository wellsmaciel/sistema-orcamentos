import { useState } from 'react';
import { fieldErrorProps } from '../utils/form-errors.js';
import { PHONE_EXAMPLE, PHONE_LANDLINE_EXAMPLE, phoneErrorMessage, standardizeBrazilianPhone } from '../utils/phone.js';
import FieldError from './FieldError.jsx';

// Campo de telefone com DDD: ao sair do campo, um número válido é exibido no formato padrão e um inválido
// já mostra o motivo, sem esperar o envio. O aviso some quando a pessoa volta a digitar.
function PhoneField({ id, label, value, onChange, hint, errorMessage = '', announceError = true }) {
  const helpId = `${id}-help`;
  const [blurError, setBlurError] = useState('');
  const shownError = errorMessage || blurError;

  function handleBlur() {
    if (!value.trim()) {
      return;
    }

    const standardizedPhone = standardizeBrazilianPhone(value);

    if (!standardizedPhone) {
      setBlurError(phoneErrorMessage(value));
      return;
    }

    if (standardizedPhone !== value) {
      onChange({ target: { name: 'phone', value: standardizedPhone } });
    }
  }

  function handleChange(event) {
    setBlurError('');
    onChange(event);
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
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={30}
        {...fieldErrorProps(id, shownError, helpId)}
        required
      />
      <p id={helpId}>
        Celular ou fixo, com DDD. Você pode digitar somente números, por exemplo {PHONE_EXAMPLE} (celular) ou {PHONE_LANDLINE_EXAMPLE} (fixo). O
        formato será ajustado automaticamente. {hint}
      </p>
      <FieldError id={id} message={shownError} announce={errorMessage ? announceError : true} />
    </div>
  );
}

export default PhoneField;
