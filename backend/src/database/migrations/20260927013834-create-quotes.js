'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'quotes',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },

          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          client_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'clients',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          client_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },

          client_email: {
            type: Sequelize.STRING(320),
            allowNull: false,
          },

          client_phone: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },

          description: {
            type: Sequelize.TEXT,
            allowNull: false,
          },

          total_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },

          service_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },

          service_street: {
            type: Sequelize.STRING(200),
            allowNull: false,
          },

          service_number: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },

          service_complement: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },

          service_postal_code: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },

          service_district: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },

          service_city: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },

          service_state: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },

          location_notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },

          status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'DRAFT',
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
        {
          transaction,
        },
      );

      await queryInterface.addConstraint('quotes', {
        fields: ['status'],
        type: 'check',
        name: 'quotes_status_check',
        where: {
          status: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'],
        },
        transaction,
      });

      await queryInterface.addIndex('quotes', ['user_id', 'status'], {
        name: 'quotes_user_id_status_idx',
        transaction,
      });

      await queryInterface.addIndex('quotes', ['client_id'], {
        name: 'quotes_client_id_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('quotes', {
        transaction,
      });
    });
  },
};
