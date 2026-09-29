'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'quotes',
        'pricing_mode',
        {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        { transaction },
      );

      // Os orçamentos existentes possuem um total informado manualmente.
      await queryInterface.bulkUpdate('quotes', { pricing_mode: 'FIXED_TOTAL' }, { pricing_mode: null }, { transaction });

      await queryInterface.changeColumn(
        'quotes',
        'pricing_mode',
        {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        { transaction },
      );

      await queryInterface.createTable(
        'quote_items',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },

          quote_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'quotes',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          description: {
            type: Sequelize.STRING(500),
            allowNull: false,
          },

          quantity: {
            type: Sequelize.DECIMAL(12, 3),
            allowNull: false,
          },

          unit_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
          },

          position: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },

          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await queryInterface.addConstraint('quote_items', {
        fields: ['quote_id', 'position'],
        type: 'unique',
        name: 'quote_items_quote_id_position_unique',
        transaction,
      });

      const checks = [
        {
          table: 'quotes',
          fields: ['pricing_mode'],
          name: 'quotes_pricing_mode_check',
          expression: "pricing_mode IN ('ITEMIZED', 'FIXED_TOTAL')",
        },
        {
          table: 'quotes',
          fields: ['total_amount'],
          name: 'quotes_total_amount_positive_check',
          expression: 'total_amount > 0 AND total_amount <= 9999999999.99',
        },
        {
          table: 'quote_items',
          fields: ['description'],
          name: 'quote_items_description_not_empty_check',
          expression: 'char_length(btrim(description)) > 0',
        },
        {
          table: 'quote_items',
          fields: ['quantity'],
          name: 'quote_items_quantity_positive_check',
          expression: 'quantity > 0 AND quantity <= 999999999.999',
        },
        {
          table: 'quote_items',
          fields: ['unit_price'],
          name: 'quote_items_unit_price_positive_check',
          expression: 'unit_price IS NULL OR (unit_price > 0 AND unit_price <= 9999999999.99)',
        },
        {
          table: 'quote_items',
          fields: ['position'],
          name: 'quote_items_position_positive_check',
          expression: 'position > 0',
        },
      ];

      for (const check of checks) {
        await queryInterface.addConstraint(check.table, {
          fields: check.fields,
          type: 'check',
          name: check.name,
          where: Sequelize.literal(check.expression),
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('quote_items', { transaction });

      await queryInterface.removeConstraint('quotes', 'quotes_total_amount_positive_check', { transaction });

      await queryInterface.removeConstraint('quotes', 'quotes_pricing_mode_check', { transaction });

      await queryInterface.removeColumn('quotes', 'pricing_mode', {
        transaction,
      });
    });
  },
};
