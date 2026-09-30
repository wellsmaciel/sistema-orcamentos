import { useState } from 'react';
import { saveClient } from '../services/client.js';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setSubmitError('');
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
      setSubmitError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h2>{client ? 'Editar cliente' : 'Novo cliente'}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="client-name">Nome</label>
          <input id="client-name" name="name" type="text" value={formData.name} onChange={handleChange} maxLength={150} required />
        </div>

        <div>
          <label htmlFor="client-email">E-mail</label>
          <input id="client-email" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={320} required />
        </div>

        <div>
          <label htmlFor="client-phone">Telefone</label>
          <input id="client-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} minLength={8} maxLength={30} required />
        </div>
        <fieldset>
          <legend>Endereço principal</legend>

          <div>
            <label htmlFor="client-street">Rua</label>
            <input id="client-street" name="street" type="text" value={formData.street} onChange={handleChange} maxLength={200} required />
          </div>

          <div>
            <label htmlFor="client-number">Número</label>
            <input id="client-number" name="number" type="text" value={formData.number} onChange={handleChange} maxLength={30} required />
          </div>

          <div>
            <label htmlFor="client-complement">Complemento</label>
            <input id="client-complement" name="complement" type="text" value={formData.complement} onChange={handleChange} maxLength={150} />
          </div>

          <div>
            <label htmlFor="client-postal-code">CEP</label>
            <input id="client-postal-code" name="postalCode" type="text" value={formData.postalCode} onChange={handleChange} maxLength={20} required />
          </div>

          <div>
            <label htmlFor="client-district">Bairro</label>
            <input id="client-district" name="district" type="text" value={formData.district} onChange={handleChange} maxLength={100} required />
          </div>

          <div>
            <label htmlFor="client-city">Cidade</label>
            <input id="client-city" name="city" type="text" value={formData.city} onChange={handleChange} maxLength={100} required />
          </div>

          <div>
            <label htmlFor="client-state">Estado</label>
            <input id="client-state" name="state" type="text" value={formData.state} onChange={handleChange} maxLength={100} required />
          </div>
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
