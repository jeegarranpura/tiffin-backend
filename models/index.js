const sequelize = require('../config/database');
const Plan = require('./Plan');
const Customer = require('./Customer');
const Route = require('./Route');
const Order = require('./Order');
const Delivery = require('./Delivery');
const User = require('./User');
const Payment = require('./Payment');
const Subscription = require('./Subscription');
const SubscriptionSkip = require('./SubscriptionSkip');

// Associations
Customer.belongsTo(Plan, { foreignKey: 'planId' });
Plan.hasMany(Customer, { foreignKey: 'planId' });


Order.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(Order, { foreignKey: 'customerId' });

Order.belongsTo(Route, { foreignKey: 'routeId' });
Route.hasMany(Order, { foreignKey: 'routeId' });

Customer.belongsTo(Route, { foreignKey: 'routeId' });
Route.hasMany(Customer, { foreignKey: 'routeId', as: 'Customers' });

Delivery.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasOne(Delivery, { foreignKey: 'orderId' });

Payment.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(Payment, { foreignKey: 'customerId' });

Payment.belongsTo(Plan, { foreignKey: 'planId' });
Payment.belongsTo(Subscription, { foreignKey: 'subscriptionId' });
Subscription.hasMany(Payment, { foreignKey: 'subscriptionId' });

Route.belongsTo(User, { as: 'agent', foreignKey: 'assignedTo' });
Delivery.belongsTo(User, { as: 'agent', foreignKey: 'agentId' });

// Subscription Associations
Customer.hasMany(Subscription, { foreignKey: 'customerId' });
Subscription.belongsTo(Customer, { foreignKey: 'customerId' });
Subscription.belongsTo(Plan, { foreignKey: 'planId' });
Plan.hasMany(Subscription, { foreignKey: 'planId' });

// SubscriptionSkip Associations
Subscription.hasMany(SubscriptionSkip, { foreignKey: 'subscriptionId' });
SubscriptionSkip.belongsTo(Subscription, { foreignKey: 'subscriptionId' });

Customer.belongsTo(Route, { foreignKey: 'routeId' });
Route.hasMany(Customer, { foreignKey: 'routeId' });

module.exports = {
  sequelize,
  Plan,
  Customer,
  Route,
  Order,
  Delivery,
  User,
  Payment,
  Subscription,
  SubscriptionSkip,
};
