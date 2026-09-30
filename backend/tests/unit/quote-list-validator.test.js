import { validateQuoteListInput } from '../../src/validators/quote-list.js';

describe('Validação dos filtros de orçamentos', () => {
  test('deve aceitar consulta sem filtros', () => {
    expect(validateQuoteListInput({})).toEqual([]);
  });

  test('deve aceitar filtros válidos combinados', () => {
    const errors = validateQuoteListInput({
      page: '2',
      search: 'Maria',
      status: 'ACCEPTED',
      serviceDateFrom: '2026-10-01',
      serviceDateTo: '2026-10-31',
    });

    expect(errors).toEqual([]);
  });

  test('deve aceitar uma data válida em ano bissexto', () => {
    expect(
      validateQuoteListInput({
        serviceDateFrom: '2028-02-29',
      }),
    ).toEqual([]);
  });

  test.each(['2026-02-29', '2026-04-31', '2026-13-01', '01/10/2026'])('deve rejeitar a data inválida %s', (date) => {
    const errors = validateQuoteListInput({
      serviceDateFrom: date,
    });

    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'serviceDateFrom',
      }),
    );
  });

  test('deve rejeitar intervalo de datas invertido', () => {
    const errors = validateQuoteListInput({
      serviceDateFrom: '2026-10-31',
      serviceDateTo: '2026-10-01',
    });

    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'serviceDateTo',
      }),
    );
  });

  test('deve rejeitar situação desconhecida', () => {
    const errors = validateQuoteListInput({
      status: 'INVALID',
    });

    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'status',
      }),
    );
  });

  test.each(['0', '-1', '1.5', '1000001'])('deve rejeitar a página inválida %s', (page) => {
    const errors = validateQuoteListInput({ page });

    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'page',
      }),
    );
  });

  test('deve rejeitar busca recebida como lista', () => {
    const errors = validateQuoteListInput({
      search: ['Maria', 'João'],
    });

    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'search',
      }),
    );
  });

  test('deve rejeitar busca com mais de 150 caracteres', () => {
    const errors = validateQuoteListInput({
      search: 'a'.repeat(151),
    });

    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'search',
      }),
    );
  });
});
