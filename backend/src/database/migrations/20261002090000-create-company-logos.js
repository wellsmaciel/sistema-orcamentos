'use strict';

const PREVIOUS_ACTIONS = "'CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED', 'CLIENT_DEACTIVATED', 'CLIENT_REACTIVATED', 'COMPANY_CREATED', 'COMPANY_UPDATED'";
const LOGO_ACTIONS = "'COMPANY_LOGO_UPDATED', 'COMPANY_LOGO_REMOVED'";

async function replaceActionConstraint(queryInterface, Sequelize, actions, transaction) {
  await queryInterface.removeConstraint('activity_logs', 'activity_logs_action_check', { transaction });
  await queryInterface.addConstraint('activity_logs', {
    fields: ['action'],
    type: 'check',
    name: 'activity_logs_action_check',
    where: Sequelize.literal(`action IN (${actions})`),
    transaction,
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Tabela separada: a imagem só é lida quando for exibida, sem pesar nas consultas do perfil.
      await queryInterface.createTable('company_logos', {
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: { model: 'companies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        content: {
          type: Sequelize.BLOB,
          allowNull: false,
        },
        mime_type: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        size_bytes: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addConstraint('company_logos', {
        fields: ['mime_type'],
        type: 'check',
        name: 'company_logos_mime_type_check',
        where: Sequelize.literal("mime_type IN ('image/png', 'image/jpeg', 'image/webp')"),
        transaction,
      });

      await queryInterface.addConstraint('company_logos', {
        fields: ['size_bytes'],
        type: 'check',
        name: 'company_logos_size_check',
        where: Sequelize.literal('size_bytes > 0 AND size_bytes <= 204800'),
        transaction,
      });

      await replaceActionConstraint(queryInterface, Sequelize, `${PREVIOUS_ACTIONS}, ${LOGO_ACTIONS}`, transaction);
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`DELETE FROM activity_logs WHERE action IN (${LOGO_ACTIONS})`, { transaction });
      await replaceActionConstraint(queryInterface, Sequelize, PREVIOUS_ACTIONS, transaction);
      await queryInterface.dropTable('company_logos', { transaction });
    });
  },
};
