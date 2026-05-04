const express = require('express');
const router = express.Router();
const { Order, Customer, Route, Payment, Subscription } = require('../models');
const { Op } = require('sequelize');

// Daily Delivery Report
router.get('/daily-delivery', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const orders = await Order.findAll({
      where: { orderDate: today },
      include: [Customer, Route]
    });

    const summary = {
      total: orders.length,
      packed: orders.filter(o => o.status === 'packed').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      pending: orders.filter(o => o.status === 'pending').length,
      failed: orders.filter(o => o.status === 'failed').length,
      details: orders
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer Stats
router.get('/customer-stats', async (req, res) => {
  try {
    const activeCustomers = await Customer.count({ where: { isActive: true } });
    const regularCustomers = await Customer.count({ where: { type: 'monthly', isActive: true } });
    const trialCustomers = await Customer.count({ where: { type: 'trial', isActive: true } });

    res.json({
      activeCustomers,
      regularCustomers,
      trialCustomers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pending / Missed Deliveries (Historical or today)
router.get('/pending-deliveries', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const pending = await Order.findAll({
      where: {
        status: 'packed',
        orderDate: today
      },
      include: [Customer, Route]
    });

    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Customers whose subscriptions expire tomorrow
router.get('/expiring-subscriptions', async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find payments that expire tomorrow
    const expiringPayments = await Payment.findAll({
      where: {
        expiryDate: {
          [Op.gte]: `${tomorrowStr} 00:00:00`,
          [Op.lte]: `${tomorrowStr} 23:59:59`
        },
        type: 'monthly'
      },
      include: [{ model: Customer, attributes: ['name', 'phone', 'address'] }]
    });

    res.json(expiringPayments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Active Customers Report
router.get('/active-customers', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: { isActive: true },
      include: [Subscription]
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customers who did not renew the plan
router.get('/non-renewed-customers', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find all customers whose last subscription expired today or earlier
    // and don't have any subscription that starts today or later
    const customers = await Customer.findAll({
      include: [{
        model: Subscription,
        as: 'Subscriptions'
      }]
    });

    const nonRenewed = customers.filter(customer => {
      const subs = customer.Subscriptions || [];
      if (subs.length === 0) return false;

      const hasActiveOrFuture = subs.some(s => s.endDate >= today && s.status === 'active');
      const hasExpired = subs.some(s => s.endDate < today);

      return hasExpired && !hasActiveOrFuture;
    });

    res.json(nonRenewed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upcoming Payment Report
router.get('/upcoming-payments', async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcoming = await Subscription.findAll({
      where: {
        endDate: {
          [Op.between]: [today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0]]
        },
        status: 'active'
      },
      include: [Customer]
    });

    res.json(upcoming);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
