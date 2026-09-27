import { DataTypes, Model, Sequelize } from 'sequelize';

import sequelize from '../config/database.js';

class Quote extends Model {}

Quote.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },

    quoteNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      unique: true,
      field: 'quote_number',
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },

    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'client_id',
    },

    clientName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'client_name',
    },

    clientEmail: {
      type: DataTypes.STRING(320),
      allowNull: false,
      field: 'client_email',
    },

    clientPhone: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'client_phone',
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'total_amount',
    },

    serviceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'service_date',
    },

    serviceStreet: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'service_street',
    },

    serviceNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'service_number',
    },

    serviceComplement: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'service_complement',
    },

    servicePostalCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'service_postal_code',
    },

    serviceDistrict: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'service_district',
    },

    serviceCity: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'service_city',
    },

    serviceState: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'service_state',
    },

    locationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'location_notes',
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: [['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']],
      },
    },
  },
  {
    sequelize,
    modelName: 'Quote',
    tableName: 'quotes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export default Quote;
