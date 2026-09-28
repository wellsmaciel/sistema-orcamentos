'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'quotes',
        'responded_at',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        {
          transaction,
        },
      );

      await queryInterface.addColumn(
        'quotes',
        'rejection_reason',
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        {
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('quotes', 'rejection_reason', {
        transaction,
      });

      await queryInterface.removeColumn('quotes', 'responded_at', {
        transaction,
      });
    });
  },
};
