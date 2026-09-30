import { validateActivityListInput } from '../../src/validators/activity-list.js';
import { toChangedFields } from '../../src/services/activity-log.js';

describe('validateActivityListInput', () => {
  test('aceita a consulta sem página ou com página válida', () => {
    expect(validateActivityListInput({})).toEqual([]);
    expect(validateActivityListInput({ page: '3' })).toEqual([]);
  });

  test('rejeita página inválida e parâmetros desconhecidos', () => {
    expect(validateActivityListInput({ page: '0' })).toEqual([{ field: 'page', message: 'Informe uma página entre 1 e 1000000.' }]);
    expect(validateActivityListInput({ page: 'abc' })).toEqual([{ field: 'page', message: 'Informe uma página entre 1 e 1000000.' }]);
    expect(validateActivityListInput({ userId: 'outro' })).toEqual([{ field: 'userId', message: 'Este parâmetro não é permitido.' }]);
  });
});

describe('toChangedFields', () => {
  test('agrupa os campos de endereço e ordena os nomes', () => {
    expect(toChangedFields(['street', 'phone', 'city', 'name'])).toEqual(['address', 'name', 'phone']);
  });

  test('trata ausência de alterações', () => {
    expect(toChangedFields(false)).toEqual([]);
  });
});
