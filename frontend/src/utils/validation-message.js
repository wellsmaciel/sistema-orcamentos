// Nomes dos campos da API como aparecem nas telas.
const FIELD_LABELS = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  taxId: 'CPF ou CNPJ',
  address: 'Endereço',
  street: 'Rua',
  number: 'Número',
  complement: 'Complemento',
  postalCode: 'CEP',
  district: 'Bairro',
  city: 'Cidade',
  state: 'Estado',
  clientId: 'Cliente',
  description: 'Descrição',
  pricingMode: 'Forma de cobrança',
  totalAmount: 'Valor total',
  serviceDate: 'Data do serviço',
  serviceAddress: 'Endereço do serviço',
  locationNotes: 'Observações do local',
  items: 'Itens',
  quantity: 'Quantidade',
  unitPrice: 'Preço unitário',
};

// "address.postalCode" vira "CEP"; "items[1].quantity" vira "Item 2 – Quantidade".
function labelField(field = '') {
  const itemMatch = field.match(/^items\[(\d+)\](?:\.(\w+))?$/);

  if (itemMatch) {
    const itemLabel = `Item ${Number(itemMatch[1]) + 1}`;
    return itemMatch[2] ? `${itemLabel} – ${FIELD_LABELS[itemMatch[2]] ?? itemMatch[2]}` : itemLabel;
  }

  const lastPart = field.split('.').at(-1);

  return FIELD_LABELS[lastPart] ?? field;
}

// Monta a mensagem de erro a partir da resposta da API, mostrando o motivo de cada campo recusado.
function describeApiError(responseBody, fallbackMessage) {
  const details = Array.isArray(responseBody?.details) ? responseBody.details : [];

  if (details.length > 0) {
    return details.map((detail) => `${labelField(detail.field)}: ${detail.message}`).join(' ');
  }

  return responseBody?.message || fallbackMessage;
}

export { describeApiError, labelField };
