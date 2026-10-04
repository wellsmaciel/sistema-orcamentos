import { fieldErrorProps } from '../utils/form-errors.js';
import { standardizeBrazilianTaxId } from '../utils/tax-id.js';
import FieldError from './FieldError.jsx';

const FIELD_ID = 'company-tax-id';

function TaxIdField({ value, onChange, errorMessage = '', announceError = true }) {
  function handleBlur() {
    if (!value.trim()) {
      return;
    }

    const standardizedTaxId = standardizeBrazilianTaxId(value);

    if (standardizedTaxId && standardizedTaxId !== value) {
      onChange({ target: { name: 'taxId', value: standardizedTaxId } });
    }
  }

  return (
    <div>
      <label htmlFor={FIELD_ID}>CPF ou CNPJ</label>
      <input
        id={FIELD_ID}
        name="taxId"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        maxLength={20}
        {...fieldErrorProps(FIELD_ID, errorMessage, `${FIELD_ID}-hint`)}
      />
      <p id={`${FIELD_ID}-hint`}>Opcional. CPF com 11 dígitos ou CNPJ com 14 dígitos. Você pode digitar somente números; a pontuação será adicionada automaticamente. Se informado, aparece no orçamento enviado ao cliente.</p>
      <FieldError id={FIELD_ID} message={errorMessage} announce={announceError} />
    </div>
  );
}

export default TaxIdField;
