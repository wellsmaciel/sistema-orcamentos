'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('activity_logs', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        sequence: {
          type: Sequelize.BIGINT,
          allowNull: false,
          autoIncrement: true,
          unique: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        action: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        entity_type: {
          type: Sequelize.STRING(16),
          allowNull: false,
        },
        // Sem chave estrangeira: o registro continua existindo depois que o cliente é excluído.
        entity_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        details: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('activity_logs', ['user_id', 'sequence'], {
        name: 'activity_logs_user_timeline_idx',
        transaction,
      });

      await queryInterface.addConstraint('activity_logs', {
        fields: ['action'],
        type: 'check',
        name: 'activity_logs_action_check',
        where: Sequelize.literal("action IN ('CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED', 'CLIENT_DEACTIVATED', 'CLIENT_REACTIVATED', 'COMPANY_CREATED', 'COMPANY_UPDATED')"),
        transaction,
      });

      await queryInterface.addConstraint('activity_logs', {
        fields: ['entity_type'],
        type: 'check',
        name: 'activity_logs_entity_type_check',
        where: Sequelize.literal("entity_type IN ('CLIENT', 'COMPANY')"),
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs');
  },
};
