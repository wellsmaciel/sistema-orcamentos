'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clients', {
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

      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      email: {
        type: Sequelize.STRING(320),
        allowNull: false,
      },

      phone: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },

      street: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },

      number: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },

      complement: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      district: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      state: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    });

    await queryInterface.addIndex('clients', ['user_id', 'active'], {
      name: 'clients_user_id_active_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('clients');
  },
};
