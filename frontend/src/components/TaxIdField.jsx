import { useState } from 'react';
import { fieldErrorProps } from '../utils/form-errors.js';
import { standardizeBrazilianTaxId, taxIdErrorMessage } from '../utils/tax-id.js';
import FieldError from './FieldError.jsx';

const FIELD_ID = 'company-tax-id';

// Como o telefone: ao sair do campo, um CPF ou CNPJ válido ganha a pontuação e um inválido já mostra o motivo.
function TaxIdField({ value, onChange, errorMessage = '', announceError = true }) {
  const [blurError, setBlurError] = useState('');
  const shownError = errorMessage || blurError;

  function handleBlur() {
    if (!value.trim()) {
      return;
    }

    const standardizedTaxId = standardizeBrazilianTaxId(value);

    if (!standardizedTaxId) {
      setBlurError(taxIdErrorMessage(value));
      return;
    }

    if (standardizedTaxId !== value) {
      onChange({ target: { name: 'taxId', value: standardizedTaxId } });
    }
  }

  function handleChange(event) {
    setBlurError('');
    onChange(event);
  }

  return (
    <div>
      <label htmlFor={FIELD_ID}>CPF ou CNPJ</label>
      <input
        id={FIELD_ID}
        name="taxId"
        type="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={20}
        {...fieldErrorProps(FIELD_ID, shownError, `${FIELD_ID}-hint`)}
      />
      <p id={`${FIELD_ID}-hint`}>Opcional. CPF com 11 números ou CNPJ com 14 caracteres (CNPJs novos podem ter letras). Você pode digitar sem pontuação; ela será adicionada automaticamente. Se informado, aparece no orçamento enviado ao cliente.</p>
      <FieldError id={FIELD_ID} message={shownError} announce={errorMessage ? announceError : true} />
    </div>
  );
}

export default TaxIdField;
