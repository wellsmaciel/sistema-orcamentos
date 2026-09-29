import { DataTypes, Model, Sequelize } from 'sequelize';

import sequelize from '../config/database.js';

class QuoteItem extends Model {}

QuoteItem.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },

    quoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'quote_id',
      references: {
        model: 'quotes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },

    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },

    quantity: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0.001,
      },
    },

    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'unit_price',
      validate: {
        isDecimal: true,
        min: 0.01,
      },
    },

    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
    },
  },
  {
    sequelize,
    modelName: 'QuoteItem',
    tableName: 'quote_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

export default QuoteItem;
