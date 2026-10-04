import { useState } from 'react';
import { saveClient } from '../services/client.js';
import { PHONE_ERROR_MESSAGE, normalizeBrazilianPhone } from '../utils/phone.js';
import { focusFirstFieldWithError } from '../utils/form-errors.js';
import FormField from './FormField.jsx';
import PhoneField from './PhoneField.jsx';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  street: '',
  number: '',
  complement: '',
  postalCode: '',
  district: '',
  city: '',
  state: '',
};

function ClientForm({ getAccessTokenSilently, client, onSaved, onCancel }) {
  const [formData, setFormData] = useState(() =>
    client
      ? {
          name: client.name,
          email: client.email,
          phone: client.phone,
          street: client.address.street,
          number: client.address.number,
          complement: client.address.complement ?? '',
          postalCode: client.address.postalCode,
          district: client.address.district,
          city: client.address.city,
          state: client.address.state,
        }
      : { ...initialFormData },
  );
  const [createdClient, setCreatedClient] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  // Erros encontrados pela tela são anunciados no próprio campo; os do servidor, pela mensagem geral.
  const [announceFieldErrors, setAnnounceFieldErrors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));

    setFieldErrors((currentErrors) => (currentErrors[name] ? { ...currentErrors, [name]: '' } : currentErrors));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!normalizeBrazilianPhone(formData.phone)) {
      setFieldErrors({ phone: PHONE_ERROR_MESSAGE });
      setAnnounceFieldErrors(true);
      setSubmitError('');
      focusFirstFieldWithError(form, { phone: PHONE_ERROR_MESSAGE });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setFieldErrors({});
      setCreatedClient(null);

      const savedClient = await saveClient(
        getAccessTokenSilently,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: {
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            postalCode: formData.postalCode,
            district: formData.district,
            city: formData.city,
            state: formData.state,
          },
        },
        client?.id,
      );

      setCreatedClient(savedClient);

      if (!client) {
        setFormData({ ...initialFormData });
      }

      onSaved?.(savedClient);
    } catch (requestError) {
      const serverFieldErrors = requestError.fieldErrors ?? {};

      setSubmitError(requestError.message);
      setFieldErrors(serverFieldErrors);
      setAnnounceFieldErrors(false);
      focusFirstFieldWithError(form, serverFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h2>{client ? 'Editar cliente' : 'Novo cliente'}</h2>

      <form onSubmit={handleSubmit}>
        <FormField id="client-name" label="Nome" name="name" type="text" value={formData.name} onChange={handleChange} maxLength={150} required errorMessage={fieldErrors.name} />

        <FormField id="client-email" label="E-mail" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={320} required errorMessage={fieldErrors.email} />

        <PhoneField
          id="client-phone"
          label="Telefone"
          value={formData.phone}
          onChange={handleChange}
          hint="Se for celular, também permite enviar o orçamento pelo WhatsApp."
          errorMessage={fieldErrors.phone}
          announceError={announceFieldErrors}
        />
        <fieldset>
          <legend>Endereço principal</legend>

          <FormField id="client-street" label="Rua" name="street" type="text" value={formData.street} onChange={handleChange} maxLength={200} required errorMessage={fieldErrors.street} />

          <FormField id="client-number" label="Número" name="number" type="text" value={formData.number} onChange={handleChange} maxLength={30} required errorMessage={fieldErrors.number} />

          <FormField id="client-complement" label="Complemento" name="complement" type="text" value={formData.complement} onChange={handleChange} maxLength={150} errorMessage={fieldErrors.complement} />

          <FormField id="client-postal-code" label="CEP" name="postalCode" type="text" value={formData.postalCode} onChange={handleChange} maxLength={20} required errorMessage={fieldErrors.postalCode} />

          <FormField id="client-district" label="Bairro" name="district" type="text" value={formData.district} onChange={handleChange} maxLength={100} required errorMessage={fieldErrors.district} />

          <FormField id="client-city" label="Cidade" name="city" type="text" value={formData.city} onChange={handleChange} maxLength={100} required errorMessage={fieldErrors.city} />

          <FormField id="client-state" label="Estado" name="state" type="text" value={formData.state} onChange={handleChange} maxLength={100} required errorMessage={fieldErrors.state} />
        </fieldset>

        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : client ? 'Salvar alterações' : 'Salvar cliente'}
        </button>

        {client && (
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar edição
          </button>
        )}

        {submitError && <p role="alert">{submitError}</p>}

        {createdClient && (
          <p role="status">
            Cliente {createdClient.name} {client ? 'atualizado' : 'cadastrado'} com sucesso.
          </p>
        )}
      </form>
    </section>
  );
}

export default ClientForm;
