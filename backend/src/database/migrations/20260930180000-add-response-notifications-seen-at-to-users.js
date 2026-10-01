'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('users', 'response_notifications_seen_at', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      // Respostas recebidas antes deste recurso não aparecem como novas.
      await queryInterface.sequelize.query('UPDATE users SET response_notifications_seen_at = CURRENT_TIMESTAMP', { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'response_notifications_seen_at');
  },
};
