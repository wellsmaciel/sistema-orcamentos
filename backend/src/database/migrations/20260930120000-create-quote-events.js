'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('quote_events', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        quote_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'quotes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        event_type: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        actor_type: {
          type: Sequelize.STRING(16),
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

      await queryInterface.addIndex('quote_events', ['quote_id', 'created_at', 'id'], {
        name: 'quote_events_quote_timeline_idx',
        transaction,
      });

      await queryInterface.addConstraint('quote_events', {
        fields: ['event_type'],
        type: 'check',
        name: 'quote_events_event_type_check',
        where: Sequelize.literal("event_type IN ('CREATED', 'UPDATED', 'CONFIRMED', 'ACCEPTED', 'REJECTED', 'CORRECTION_CREATED', 'CREATED_FROM_CORRECTION')"),
        transaction,
      });

      await queryInterface.addConstraint('quote_events', {
        fields: ['actor_type'],
        type: 'check',
        name: 'quote_events_actor_type_check',
        where: Sequelize.literal("actor_type IN ('PROVIDER', 'CLIENT')"),
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('quote_events');
  },
};
