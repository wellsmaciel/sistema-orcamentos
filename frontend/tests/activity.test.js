import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeActivity } from '../src/utils/activity.js';

test('descreve alteração de cliente com o nome e os campos alterados', () => {
  assert.equal(
    describeActivity({ action: 'CLIENT_UPDATED', entityType: 'CLIENT', entityName: 'Maria', changedFields: ['address', 'phone'] }),
    'Dados do cliente alterados: Maria (endereço, telefone)',
  );
});

test('não repete o nome de um cliente que já foi excluído', () => {
  assert.equal(describeActivity({ action: 'CLIENT_DELETED', entityType: 'CLIENT', entityName: null, changedFields: [] }), 'Cliente excluído');
  assert.equal(describeActivity({ action: 'CLIENT_CREATED', entityType: 'CLIENT', entityName: null, changedFields: [] }), 'Cliente cadastrado: cliente já excluído');
});

test('descreve alterações do perfil profissional', () => {
  assert.equal(
    describeActivity({ action: 'COMPANY_UPDATED', entityType: 'COMPANY', entityName: null, changedFields: ['taxId'] }),
    'Perfil profissional alterado (CPF/CNPJ)',
  );
});

test('descreve a troca e a remoção do logo da empresa', () => {
  assert.equal(describeActivity({ action: 'COMPANY_LOGO_UPDATED', entityType: 'COMPANY', entityName: null, changedFields: [] }), 'Logo da empresa alterado');
  assert.equal(describeActivity({ action: 'COMPANY_LOGO_REMOVED', entityType: 'COMPANY', entityName: null, changedFields: [] }), 'Logo da empresa removido');
});
