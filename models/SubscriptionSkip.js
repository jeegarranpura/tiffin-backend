const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionSkip = sequelize.define('SubscriptionSkip', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subscriptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Subscriptions',
      key: 'id',
    }
  },
  dateOfSkip: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = SubscriptionSkip;
