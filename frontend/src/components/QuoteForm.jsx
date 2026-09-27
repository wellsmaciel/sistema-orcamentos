import { useState } from 'react';

const initialFormData = {
  clientId: '',
  description: '',
  totalAmount: '',
  serviceDate: '',
  street: '',
  number: '',
  complement: '',
  postalCode: '',
  district: '',
  city: '',
  state: '',
  locationNotes: '',
};

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function QuoteForm({ clients, getAccessTokenSilently }) {
  const [formData, setFormData] = useState(initialFormData);
  const [createdQuote, setCreatedQuote] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedClient = clients.find((client) => client.id === formData.clientId);

  function handleClientChange(event) {
    const clientId = event.target.value;
    const client = clients.find((item) => item.id === clientId);

    if (!client) {
      setFormData((currentFormData) => ({
        ...currentFormData,
        clientId: '',
        street: '',
        number: '',
        complement: '',
        postalCode: '',
        district: '',
        city: '',
        state: '',
      }));

      return;
    }

    setFormData((currentFormData) => ({
      ...currentFormData,
      clientId: client.id,
      street: client.address.street,
      number: client.address.number,
      complement: client.address.complement ?? '',
      postalCode: client.address.postalCode,
      district: client.address.district,
      city: client.address.city,
      state: client.address.state,
    }));
  }

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
      setCreatedQuote(null);

      const accessToken = await getAccessTokenSilently();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: formData.clientId,
          description: formData.description,
          totalAmount: formData.totalAmount,
          serviceDate: formData.serviceDate,
          serviceAddress: {
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            postalCode: formData.postalCode,
            district: formData.district,
            city: formData.city,
            state: formData.state,
          },
          locationNotes: formData.locationNotes,
        }),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        const detailsMessage = responseBody.details?.map((detail) => `${detail.field}: ${detail.message}`).join(' ');

        throw new Error(detailsMessage ?? responseBody.message ?? 'Não foi possível criar o orçamento.');
      }

      setCreatedQuote(responseBody);
      setFormData(initialFormData);
    } catch (requestError) {
      setSubmitError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (clients.length === 0) {
    return (
      <section>
        <h2>Novo orçamento</h2>
        <p>Atualize a lista de clientes antes de criar um orçamento.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Novo orçamento</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="quote-client">Cliente</label>

          <select id="quote-client" value={formData.clientId} onChange={handleClientChange} required>
            <option value="">Selecione um cliente</option>

            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClient && (
          <div>
            <p>
              <strong>E-mail:</strong> {selectedClient.email}
            </p>
            <p>
              <strong>Telefone:</strong> {selectedClient.phone}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="quote-description">Descrição</label>
          <textarea id="quote-description" name="description" value={formData.description} onChange={handleChange} maxLength={10000} required />
        </div>

        <div>
          <label htmlFor="quote-total-amount">Valor total</label>
          <input id="quote-total-amount" name="totalAmount" type="number" value={formData.totalAmount} onChange={handleChange} min="0.01" step="0.01" required />
        </div>

        <div>
          <label htmlFor="quote-service-date">Data do serviço</label>
          <input id="quote-service-date" name="serviceDate" type="date" value={formData.serviceDate} onChange={handleChange} min={getCurrentDate()} required />
        </div>

        <fieldset>
          <legend>Endereço do serviço</legend>

          <div>
            <label htmlFor="quote-street">Rua</label>
            <input id="quote-street" name="street" value={formData.street} onChange={handleChange} maxLength={200} required />
          </div>

          <div>
            <label htmlFor="quote-number">Número</label>
            <input id="quote-number" name="number" value={formData.number} onChange={handleChange} maxLength={30} required />
          </div>

          <div>
            <label htmlFor="quote-complement">Complemento</label>
            <input id="quote-complement" name="complement" value={formData.complement} onChange={handleChange} maxLength={150} />
          </div>

          <div>
            <label htmlFor="quote-postal-code">CEP</label>
            <input id="quote-postal-code" name="postalCode" value={formData.postalCode} onChange={handleChange} maxLength={20} required />
          </div>

          <div>
            <label htmlFor="quote-district">Bairro</label>
            <input id="quote-district" name="district" value={formData.district} onChange={handleChange} maxLength={100} required />
          </div>

          <div>
            <label htmlFor="quote-city">Cidade</label>
            <input id="quote-city" name="city" value={formData.city} onChange={handleChange} maxLength={100} required />
          </div>

          <div>
            <label htmlFor="quote-state">Estado</label>
            <input id="quote-state" name="state" value={formData.state} onChange={handleChange} maxLength={100} required />
          </div>
        </fieldset>

        <div>
          <label htmlFor="quote-location-notes">Observações do local</label>
          <textarea id="quote-location-notes" name="locationNotes" value={formData.locationNotes} onChange={handleChange} maxLength={2000} />
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar rascunho'}
        </button>

        {submitError && <p role="alert">{submitError}</p>}

        {createdQuote && (
          <div>
            <p>Orçamento criado com sucesso.</p>
            <p>
              <strong>Status:</strong> {createdQuote.status}
            </p>
            <p>
              <strong>Valor:</strong> R$ {createdQuote.totalAmount}
            </p>
          </div>
        )}
      </form>
    </section>
  );
}

export default QuoteForm;
