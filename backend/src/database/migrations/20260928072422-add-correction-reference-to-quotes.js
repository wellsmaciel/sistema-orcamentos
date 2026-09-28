'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'quotes',
        'corrected_from_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'quotes',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        {
          transaction,
        },
      );

      await queryInterface.addConstraint('quotes', {
        fields: ['corrected_from_id'],
        type: 'unique',
        name: 'quotes_corrected_from_id_unique',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint('quotes', 'quotes_corrected_from_id_unique', {
        transaction,
      });

      await queryInterface.removeColumn('quotes', 'corrected_from_id', {
        transaction,
      });
    });
  },
};
