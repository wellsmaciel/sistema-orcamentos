'use strict';

// O número do orçamento passa a ser contado por prestador (cada conta começa no 1), em vez de um contador
// único para todo o sistema. O próximo número de cada prestador fica em users.last_quote_number.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const query = (sql) => queryInterface.sequelize.query(sql, { transaction });

      await queryInterface.addColumn('users', 'last_quote_number', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }, { transaction });

      await query('ALTER TABLE quotes DROP CONSTRAINT quotes_quote_number_key');
      await query('ALTER TABLE quotes ALTER COLUMN quote_number DROP DEFAULT');
      await query('DROP SEQUENCE IF EXISTS quotes_quote_number_seq');

      // Renumera os orçamentos existentes de cada prestador na ordem em que foram criados.
      await query(`
        UPDATE quotes
        SET quote_number = numbered.new_number
        FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, quote_number) AS new_number
          FROM quotes
        ) AS numbered
        WHERE quotes.id = numbered.id
      `);

      // O histórico das correções guarda o número do outro orçamento; atualiza pelos identificadores.
      await query(`
        UPDATE quote_events
        SET details = jsonb_set(details, '{correctionQuoteNumber}', to_jsonb(quotes.quote_number))
        FROM quotes
        WHERE quote_events.details ? 'correctionQuoteNumber'
          AND quotes.id = (quote_events.details->>'correctionQuoteId')::uuid
      `);
      await query(`
        UPDATE quote_events
        SET details = jsonb_set(details, '{originalQuoteNumber}', to_jsonb(quotes.quote_number))
        FROM quotes
        WHERE quote_events.details ? 'originalQuoteNumber'
          AND quotes.id = (quote_events.details->>'originalQuoteId')::uuid
      `);

      await queryInterface.addConstraint('quotes', {
        fields: ['user_id', 'quote_number'],
        type: 'unique',
        name: 'quotes_user_id_quote_number_unique',
        transaction,
      });

      await query(`
        UPDATE users
        SET last_quote_number = totals.max_number
        FROM (SELECT user_id, MAX(quote_number) AS max_number FROM quotes GROUP BY user_id) AS totals
        WHERE users.id = totals.user_id
      `);
    });
  },

  // Volta ao contador único. Os números são refeitos na ordem de criação de todos os orçamentos,
  // então não voltam a ser exatamente os anteriores.
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const query = (sql) => queryInterface.sequelize.query(sql, { transaction });

      await queryInterface.removeConstraint('quotes', 'quotes_user_id_quote_number_unique', { transaction });
      await query(`
        UPDATE quotes
        SET quote_number = numbered.new_number
        FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, user_id, quote_number) AS new_number FROM quotes) AS numbered
        WHERE quotes.id = numbered.id
      `);
      await query(`
        UPDATE quote_events
        SET details = jsonb_set(details, '{correctionQuoteNumber}', to_jsonb(quotes.quote_number))
        FROM quotes
        WHERE quote_events.details ? 'correctionQuoteNumber'
          AND quotes.id = (quote_events.details->>'correctionQuoteId')::uuid
      `);
      await query(`
        UPDATE quote_events
        SET details = jsonb_set(details, '{originalQuoteNumber}', to_jsonb(quotes.quote_number))
        FROM quotes
        WHERE quote_events.details ? 'originalQuoteNumber'
          AND quotes.id = (quote_events.details->>'originalQuoteId')::uuid
      `);
      await query('CREATE SEQUENCE quotes_quote_number_seq OWNED BY quotes.quote_number');
      await query("SELECT setval('quotes_quote_number_seq', COALESCE((SELECT MAX(quote_number) FROM quotes), 0) + 1, false)");
      await query("ALTER TABLE quotes ALTER COLUMN quote_number SET DEFAULT nextval('quotes_quote_number_seq')");
      await query('ALTER TABLE quotes ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number)');
      await queryInterface.removeColumn('users', 'last_quote_number', { transaction });
    });
  },
};
