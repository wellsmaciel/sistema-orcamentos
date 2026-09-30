import { DataTypes, Model, Sequelize } from 'sequelize';

import sequelize from '../config/database.js';

class QuoteEvent extends Model {}

QuoteEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    sequence: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      unique: true,
    },
    quoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'quote_id',
    },
    eventType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'event_type',
    },
    actorType: {
      type: DataTypes.STRING(16),
      allowNull: false,
      field: 'actor_type',
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'QuoteEvent',
    tableName: 'quote_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  },
);

export default QuoteEvent;
