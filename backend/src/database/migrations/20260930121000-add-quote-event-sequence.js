'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('quote_events', 'sequence', {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        unique: true,
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('quote_events', 'sequence');
  },
};
