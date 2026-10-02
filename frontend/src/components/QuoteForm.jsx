import { useState } from 'react';
import { requestQuoteDescriptionReview } from '../services/quote-description-review.js';
import { describeApiError } from '../utils/validation-message.js';
import { buildDescriptionReviewRequest, buildQuoteRequest, formatQuoteMoney, formatQuoteQuantity, getItemsPricingPreview, isBlankFormItem } from '../utils/quote-form.js';

const idleDescriptionReview = { status: 'idle', suggestion: '', message: '' };

const emptyFormData = {
  clientId: '',
  description: '',
  pricingMode: 'FIXED_TOTAL',
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

function buildFormItem(item = {}) {
  return {
    formId: crypto.randomUUID(),
    description: item.description ?? '',
    quantity: formatQuoteQuantity(item.quantity ?? '1'),
    unitPrice: item.unitPrice ?? '',
  };
}

function buildInitialFormData(quote) {
  if (!quote) {
    return {
      ...emptyFormData,
      items: [buildFormItem()],
    };
  }

  return {
    clientId: quote.client.id,
    description: quote.description,
    pricingMode: quote.pricingMode,
    items: quote.items?.length
      ? quote.items.map((item) => buildFormItem(item))
      : [buildFormItem()],
    totalAmount: quote.totalAmount,
    serviceDate: quote.serviceDate,
    street: quote.serviceAddress.street,
    number: quote.serviceAddress.number,
    complement: quote.serviceAddress.complement ?? '',
    postalCode: quote.serviceAddress.postalCode,
    district: quote.serviceAddress.district,
    city: quote.serviceAddress.city,
    state: quote.serviceAddress.state,
    locationNotes: quote.locationNotes ?? '',
  };
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// O endereço do serviço começa igual ao endereço do cliente escolhido.
function withClientAddress(formData, client) {
  return {
    ...formData,
    clientId: client.id,
    street: client.address.street,
    number: client.address.number,
    complement: client.address.complement ?? '',
    postalCode: client.address.postalCode,
    district: client.address.district,
    city: client.address.city,
    state: client.address.state,
  };
}

function QuoteForm({ clients = [], getAccessTokenSilently, quote = null, initialClientId = null, onSaved, onReview }) {
  const [formData, setFormData] = useState(() => {
    const initialFormData = buildInitialFormData(quote);
    const initialClient = !quote && initialClientId ? clients.find((client) => client.id === initialClientId) : null;

    return initialClient ? withClientAddress(initialFormData, initialClient) : initialFormData;
  });
  const [savedQuote, setSavedQuote] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descriptionReview, setDescriptionReview] = useState(idleDescriptionReview);

  const isEditing = Boolean(quote);
  const editTitle = isEditing ? `Editar orçamento nº ${String(quote.quoteNumber).padStart(6, '0')}` : '';
  const isItemized = formData.pricingMode === 'ITEMIZED';
  const pricingPreview = isItemized ? getItemsPricingPreview(formData.items) : null;
  // Linhas em branco são ignoradas ao salvar, então também não entram no total.
  const previewTotalAmount = isItemized ? getItemsPricingPreview(formData.items.filter((item) => !isBlankFormItem(item, formData.pricingMode))).totalAmount : null;

  // Com mais de uma linha, uma linha totalmente em branco não bloqueia o envio.
  function isOptionalItem(item) {
    return formData.items.length > 1 && isBlankFormItem(item, formData.pricingMode);
  }
  const hasLegacyQuantityPrecision = isEditing && (quote.items ?? []).some((item) => (formatQuoteQuantity(item.quantity).split(',')[1]?.length ?? 0) > 1);

  const selectedClient = isEditing ? quote.client : clients.find((client) => client.id === formData.clientId);

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

    setFormData((currentFormData) => withClientAddress(currentFormData, client));
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  }

  function handleItemChange(formId, event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      items: currentFormData.items.map((item) => (item.formId === formId ? { ...item, [name]: value } : item)),
    }));
  }

  function handleAddItem() {
    const item = buildFormItem();

    setFormData((currentFormData) => ({
      ...currentFormData,
      items: [...currentFormData.items, item],
    }));
  }

  function handleRemoveItem(formId) {
    setFormData((currentFormData) => {
      if (currentFormData.items.length <= 1) {
        return currentFormData;
      }

      return {
        ...currentFormData,
        items: currentFormData.items.filter((item) => item.formId !== formId),
      };
    });
  }

  async function handleDescriptionReview() {
    try {
      setDescriptionReview({ ...idleDescriptionReview, status: 'loading' });

      const suggestion = await requestQuoteDescriptionReview(getAccessTokenSilently, buildDescriptionReviewRequest(formData));

      setDescriptionReview({ ...idleDescriptionReview, status: 'ready', suggestion });
    } catch (reviewError) {
      setDescriptionReview({ ...idleDescriptionReview, status: 'error', message: reviewError.message });
    }
  }

  function handleApplyDescriptionSuggestion() {
    setFormData((currentFormData) => ({
      ...currentFormData,
      description: descriptionReview.suggestion,
    }));
    setDescriptionReview({ ...idleDescriptionReview, status: 'applied', message: 'Sugestão aplicada. Confira o texto e salve o orçamento.' });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSavedQuote(null);

      const requestBody = buildQuoteRequest(formData, { isEditing });
      const accessToken = await getAccessTokenSilently();

      const endpoint = isEditing ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes/${quote.id}` : `${import.meta.env.VITE_API_BASE_URL}/api/v1/quotes`;

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(describeApiError(responseBody, `Não foi possível ${isEditing ? 'alterar' : 'criar'} o orçamento.`));
      }

      setSavedQuote(responseBody);

      if (!isEditing) {
        setFormData(buildInitialFormData(null));
        setDescriptionReview(idleDescriptionReview);
      }

      if (onSaved) {
        onSaved(responseBody);
      }
    } catch (requestError) {
      setSubmitError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing && quote.status !== 'DRAFT') {
    return (
      <section>
        <h2>{editTitle}</h2>
        <p role="alert">Somente orçamentos em rascunho podem ter seu conteúdo alterado.</p>
      </section>
    );
  }

  if (!isEditing && clients.length === 0) {
    return (
      <section>
        <h2>Novo orçamento</h2>
        <p>Carregue a lista de clientes antes de criar um orçamento.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>{isEditing ? editTitle : 'Novo orçamento'}</h2>

      {hasLegacyQuantityPrecision && <p role="alert">Este rascunho contém quantidades antigas com mais de uma casa decimal. Revise-as antes de salvar; nenhum valor foi arredondado automaticamente.</p>}

      <form onSubmit={handleSubmit}>
        <fieldset className="quote-form-fields" disabled={isSubmitting}>
          <legend className="visually-hidden">Dados e itens do orçamento</legend>
          {isEditing ? (
            <div>
              <p>
                <strong>Cliente:</strong> {selectedClient.name}
              </p>
              <p>
                <strong>E-mail:</strong> {selectedClient.email}
              </p>
              <p>
                <strong>Telefone:</strong> {selectedClient.phone}
              </p>
              <p>O cliente não pode ser alterado depois da criação do orçamento.</p>
            </div>
          ) : (
            <>
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
            </>
          )}

          <div>
            <label htmlFor="quote-pricing-mode">Forma de cobrança</label>
            <select id="quote-pricing-mode" name="pricingMode" value={formData.pricingMode} onChange={handleChange} aria-describedby="quote-pricing-help" required>
              <option value="FIXED_TOTAL">Valor global</option>
              <option value="ITEMIZED">Preço por item</option>
            </select>
            <p id="quote-pricing-help">
              {isItemized
                ? 'Informe o preço de cada item. O sistema calculará os subtotais e o total do orçamento.'
                : 'Descreva os itens e suas quantidades, sem preços individuais. Informe um valor global para o serviço.'}
            </p>
          </div>

          <div>
            <label htmlFor="quote-description">Descrição geral do serviço</label>
            <textarea id="quote-description" name="description" value={formData.description} onChange={handleChange} maxLength={10000} required />
          </div>

          <div className="description-review">
            <button
              type="button"
              onClick={handleDescriptionReview}
              disabled={!formData.description.trim() || descriptionReview.status === 'loading'}
              aria-describedby="quote-description-review-help"
            >
              {descriptionReview.status === 'loading' ? 'Revisando a descrição...' : 'Revisar descrição com IA'}
            </button>
            <p id="quote-description-review-help">
              Somente a descrição e os itens são enviados a um serviço de IA (Anthropic) para sugerir um texto mais claro. Não inclua dados pessoais do cliente na descrição. O texto só muda se você usar a sugestão.
            </p>

            {descriptionReview.status === 'ready' && (
              <article aria-labelledby="quote-description-suggestion-title">
                <h3 id="quote-description-suggestion-title">Sugestão da IA</h3>
                <p className="description-suggestion">{descriptionReview.suggestion}</p>
                <div className="description-review-actions">
                  <button type="button" className="button-primary" onClick={handleApplyDescriptionSuggestion}>Usar sugestão</button>
                  <button type="button" onClick={() => setDescriptionReview(idleDescriptionReview)}>Descartar</button>
                </div>
              </article>
            )}

            {descriptionReview.status === 'error' && <p role="alert">{descriptionReview.message}</p>}
            {descriptionReview.status === 'applied' && <p role="status">{descriptionReview.message}</p>}
          </div>

          <fieldset className="quote-items">
            <legend>Itens do orçamento</legend>
            <p id="quote-items-help">Inclua pelo menos um item. A quantidade aceita até uma casa decimal, por exemplo, 2,5. Use vírgula ou ponto, sem separadores de milhares.</p>
            <p>Os itens preenchidos já fazem parte do orçamento. Use "Adicionar outro item" só para incluir mais uma linha; linhas deixadas em branco são ignoradas ao salvar.</p>

            {formData.items.map((item, index) => (
              <fieldset className="quote-item" key={item.formId}>
                <legend>Item {index + 1}</legend>
                <div>
                  <label htmlFor={`quote-item-${item.formId}-description`}>Descrição do item</label>
                  <input id={`quote-item-${item.formId}-description`} name="description" value={item.description} onChange={(event) => handleItemChange(item.formId, event)} maxLength={500} required={!isOptionalItem(item)} />
                </div>

                <div className="quote-item-values">
                  <div>
                    <label htmlFor={`quote-item-${item.formId}-quantity`}>Quantidade</label>
                    <input
                      id={`quote-item-${item.formId}-quantity`}
                      name="quantity"
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(event) => handleItemChange(item.formId, event)}
                      pattern="[0-9]{1,9}([.,][0-9])?"
                      maxLength={11}
                      title="Informe uma quantidade maior que zero, com até uma casa decimal e sem separadores de milhares."
                      aria-describedby="quote-items-help"
                      required={!isOptionalItem(item)}
                    />
                  </div>

                  {isItemized && (
                    <div>
                      <label htmlFor={`quote-item-${item.formId}-unit-price`}>Preço unitário (R$)</label>
                      <input
                        id={`quote-item-${item.formId}-unit-price`}
                        name="unitPrice"
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(event) => handleItemChange(item.formId, event)}
                        pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
                        maxLength={13}
                        title="Informe um preço maior que zero, com até duas casas decimais e sem separadores de milhares."
                        required={!isOptionalItem(item)}
                      />
                    </div>
                  )}
                </div>

                {isItemized && <p><strong>Subtotal:</strong> {formatQuoteMoney(pricingPreview.subtotals[index])}</p>}

                <button type="button" className="button-danger" onClick={() => handleRemoveItem(item.formId)} disabled={formData.items.length === 1} aria-label={`Remover item ${index + 1}`}>
                  Remover item
                </button>
              </fieldset>
            ))}

            <button type="button" onClick={handleAddItem}>+ Adicionar outro item</button>
          </fieldset>

          {isItemized ? (
            <div>
              <p><strong>Total calculado (prévia):</strong> {formatQuoteMoney(previewTotalAmount)}</p>
              <p>{previewTotalAmount === null
                ? 'Preencha quantidades e preços válidos para calcular um total positivo.'
                : 'O backend recalculará e validará os valores ao salvar. Cada subtotal é arredondado para centavos antes da soma.'}</p>
            </div>
          ) : (
            <div>
              <label htmlFor="quote-total-amount">Valor global do orçamento (R$)</label>
              <input
                id="quote-total-amount"
                name="totalAmount"
                type="text"
                inputMode="decimal"
                value={formData.totalAmount}
                onChange={handleChange}
                pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
                maxLength={13}
                title="Informe um valor maior que zero, com até duas casas decimais e sem separadores de milhares."
                required
              />
            </div>
          )}

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
        </fieldset>

        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar rascunho'}
        </button>

        {submitError && <p role="alert">{submitError}</p>}

        {savedQuote && (
          <div role="status">
            <p>{isEditing ? 'Orçamento alterado com sucesso.' : 'Orçamento criado com sucesso.'}</p>
            <p>
              <strong>Status:</strong> {savedQuote.status}
            </p>
            <p>
              <strong>Forma de cobrança:</strong> {savedQuote.pricingMode === 'ITEMIZED' ? 'Preço por item' : 'Valor global'}
            </p>
            <ul>
              {savedQuote.items.map((item) => (
                <li key={item.id}>
                  {item.description} — quantidade: {formatQuoteQuantity(item.quantity)}
                  {savedQuote.pricingMode === 'ITEMIZED' && (
                    <> — preço unitário: {formatQuoteMoney(item.unitPrice)} — subtotal: {formatQuoteMoney(item.subtotal)}</>
                  )}
                </li>
              ))}
            </ul>
            <p><strong>Valor:</strong> {formatQuoteMoney(savedQuote.totalAmount)}</p>
          </div>
        )}

        {savedQuote && onReview && savedQuote.status === 'DRAFT' && (
          <button type="button" className="button-primary" onClick={() => onReview(savedQuote)}>
            Revisar e confirmar orçamento
          </button>
        )}
      </form>
    </section>
  );
}

export default QuoteForm;
