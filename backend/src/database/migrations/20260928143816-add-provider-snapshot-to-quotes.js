'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'quotes',
        'provider_name',
        {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_email',
        {
          type: Sequelize.STRING(320),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_phone',
        {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_tax_id',
        {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_street',
        {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_number',
        {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_complement',
        {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_postal_code',
        {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_district',
        {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_city',
        {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'quotes',
        'provider_state',
        {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeColumn('quotes', 'provider_state', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_city', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_district', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_postal_code', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_complement', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_number', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_street', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_tax_id', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_phone', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_email', { transaction });

      await queryInterface.removeColumn('quotes', 'provider_name', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
