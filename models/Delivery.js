const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Delivery = sequelize.define('Delivery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  currentLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  currentLong: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  homePhoto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tiffinPhoto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('picked-up', 'in-transit', 'delivered', 'failed'),
    defaultValue: 'picked-up',
  },
});

module.exports = Delivery;
