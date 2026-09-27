'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'quotes',
        'public_token',
        {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        {
          transaction,
        },
      );

      await queryInterface.addColumn(
        'quotes',
        'sent_at',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        {
          transaction,
        },
      );

      await queryInterface.addConstraint('quotes', {
        fields: ['public_token'],
        type: 'unique',
        name: 'quotes_public_token_unique',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint('quotes', 'quotes_public_token_unique', {
        transaction,
      });

      await queryInterface.removeColumn('quotes', 'sent_at', {
        transaction,
      });

      await queryInterface.removeColumn('quotes', 'public_token', {
        transaction,
      });
    });
  },
};
