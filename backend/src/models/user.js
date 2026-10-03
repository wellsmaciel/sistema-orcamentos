import { DataTypes, Model, Sequelize } from 'sequelize';

import sequelize from '../config/database.js';

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },

    auth0Subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'auth0_subject',
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(320),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },

    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'email_verified',
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    responseNotificationsSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'response_notifications_seen_at',
    },

    lastQuoteNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'last_quote_number',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export default User;
