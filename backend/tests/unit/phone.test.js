import { normalizeBrazilianPhone, standardizeBrazilianPhone } from '../../src/utils/phone.js';

// Os mesmos casos são usados no teste do frontend, para garantir que as duas regras concordam.
export const PHONE_CASES = [
  ['(21) 99999-8888', '(21) 99999-8888'],
  ['21999998888', '(21) 99999-8888'],
  ['+55 21 99999-8888', '(21) 99999-8888'],
  ['55 (11) 3333-4444', '(11) 3333-4444'],
  ['(11) 3333-4444', '(11) 3333-4444'],
  ['  11 2345 6789  ', '(11) 2345-6789'],
  ['99999-8888', null],
  ['021 99999-8888', null],
  ['(21) 89999-8888', null],
  ['(01) 99999-8888', null],
  ['(21) 6333-4444', null],
  ['21-999999-99999', null],
  ['', null],
];

describe('telefone brasileiro', () => {
  test.each(PHONE_CASES)('%p vira %p', (input, expected) => {
    expect(standardizeBrazilianPhone(input)).toBe(expected);
  });

  test('normaliza para os dígitos com DDD, sem o código do país', () => {
    expect(normalizeBrazilianPhone('+55 (21) 99999-8888')).toBe('21999998888');
    expect(normalizeBrazilianPhone(21999998888)).toBeNull();
  });
});
