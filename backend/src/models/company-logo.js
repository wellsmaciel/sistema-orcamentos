import { DataTypes, Model } from 'sequelize';

import sequelize from '../config/database.js';

class CompanyLogo extends Model {}

CompanyLogo.init(
  {
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'company_id',
    },
    content: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'mime_type',
    },
    sizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'size_bytes',
    },
  },
  {
    sequelize,
    modelName: 'CompanyLogo',
    tableName: 'company_logos',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
  },
);

export default CompanyLogo;
