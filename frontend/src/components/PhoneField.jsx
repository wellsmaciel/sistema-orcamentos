import { PHONE_EXAMPLE, standardizeBrazilianPhone } from '../utils/phone.js';

// Campo de telefone com DDD: ao sair do campo, um número válido é exibido no formato padrão.
function PhoneField({ id, label, value, onChange, hint }) {
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
        aria-describedby={`${id}-help`}
        required
      />
      <p id={`${id}-help`}>Com DDD, por exemplo {PHONE_EXAMPLE}. {hint}</p>
    </div>
  );
}

export default PhoneField;
