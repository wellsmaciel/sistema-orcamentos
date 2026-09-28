'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'companies',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },

          owner_user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
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

          tax_id: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },

          street: {
            type: Sequelize.STRING(200),
            allowNull: true,
          },

          number: {
            type: Sequelize.STRING(30),
            allowNull: true,
          },

          complement: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },

          postal_code: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },

          district: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },

          city: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },

          state: {
            type: Sequelize.STRING(100),
            allowNull: true,
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
        },
        {
          transaction,
        },
      );

      await queryInterface.addConstraint('companies', {
        fields: ['owner_user_id'],
        type: 'unique',
        name: 'companies_owner_user_id_unique',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('companies', {
        transaction,
      });
    });
  },
};
