const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pricing: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Veg', 'Non-Veg', 'Both'),
    defaultValue: 'Veg',
  },
  mealTime: {
    type: DataTypes.ENUM('Lunch', 'Dinner', 'Both'),
    defaultValue: 'Lunch',
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  rules: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = Plan;
