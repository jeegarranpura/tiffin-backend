const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  mealTime: {
    type: DataTypes.ENUM('Lunch', 'Dinner'),
    allowNull: false,
  },
  orderDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('monthly', 'trial'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'packed', 'ready', 'delivered', 'failed', 'cancelled'),
    defaultValue: 'pending',
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  packingTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deliveryTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = Order;
