const ACTION_LABELS = {
  CLIENT_CREATED: 'Cliente cadastrado',
  CLIENT_UPDATED: 'Dados do cliente alterados',
  CLIENT_DELETED: 'Cliente excluído',
  CLIENT_DEACTIVATED: 'Cliente inativado',
  CLIENT_REACTIVATED: 'Cliente reativado',
  COMPANY_CREATED: 'Perfil profissional cadastrado',
  COMPANY_UPDATED: 'Perfil profissional alterado',
  COMPANY_LOGO_UPDATED: 'Logo da empresa alterado',
  COMPANY_LOGO_REMOVED: 'Logo da empresa removido',
};

const FIELD_LABELS = {
  name: 'nome',
  email: 'e-mail',
  phone: 'telefone',
  address: 'endereço',
  taxId: 'CPF/CNPJ',
};

// Monta a frase exibida na lista, por exemplo "Dados do cliente alterados: Maria (telefone, endereço)".
function describeActivity(activity) {
  const label = ACTION_LABELS[activity.action] ?? 'Atividade registrada';
  let subject = '';

  // Os dados de um cliente excluído não ficam guardados, então o nome deixa de aparecer.
  if (activity.entityType === 'CLIENT' && activity.action !== 'CLIENT_DELETED') {
    subject = activity.entityName ?? 'cliente já excluído';
  }

  const fields = (activity.changedFields ?? []).map((field) => FIELD_LABELS[field] ?? field);
  const fieldsText = fields.length > 0 ? ` (${fields.join(', ')})` : '';

  return subject ? `${label}: ${subject}${fieldsText}` : `${label}${fieldsText}`;
}

function formatActivityDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export { describeActivity, formatActivityDate };
