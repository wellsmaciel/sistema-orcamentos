import { DataTypes, Model, Sequelize } from 'sequelize';

import sequelize from '../config/database.js';

class Company extends Model {}

Company.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },

    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'owner_user_id',
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(320),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    taxId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'tax_id',
    },

    street: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    number: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    complement: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code',
    },

    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Company',
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export default Company;
