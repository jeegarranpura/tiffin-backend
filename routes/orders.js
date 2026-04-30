const express = require('express');
const router = express.Router();
const { Order, Customer, Route } = require('../models');
const { Op } = require('sequelize');

// List all orders with optional filters
router.get('/', async (req, res) => {
  try {
    const { date, status, mealTime, customerId } = req.query;
    const where = {};

    if (date) where.orderDate = date;
    if (status) where.status = status;
    if (mealTime) where.mealTime = mealTime;
    if (customerId) where.customerId = customerId;

    const orders = await Order.findAll({
      where,
      include: [
        { model: Customer, attributes: ['name', 'phone', 'address'] },
        { model: Route, attributes: ['name'] }
      ],
      order: [['orderDate', 'DESC'], ['priority', 'ASC']]
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [Customer, Route]
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/update-status/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await order.update({ status });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
