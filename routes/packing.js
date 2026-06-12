const express = require('express');
const router = express.Router();
const { Route, Customer, Order, SubscriptionSkip } = require('../models');
const { generateDailyOrders } = require('../utils/orderGenerator');
const { Op } = require('sequelize');

// Packer: View Route-wise order list for today
router.get('/route-list/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    console.log('[packaging route] today', today)

    // Find all orders assigned to this route
    const orders = await Order.findAll({
      where: { routeId, orderDate: today },
      include: [Customer]
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Packer: Mark Order as Packed
router.post('/mark-packed/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await order.update({ status: 'packed', packingTime: new Date() });

    // Check if all orders for this route are packed
    const routeId = order.routeId;
    const unpackedOrders = await Order.count({
      where: { routeId, status: { [Op.ne]: 'packed' }, orderDate: order.orderDate }
    });

    if (unpackedOrders === 0) {
      await Route.update({ status: 'ready' }, { where: { id: routeId } });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Trigger daily order generation (Manual trigger for testing or catch-up)
router.post('/generate-daily-orders', async (req, res) => {
  try {
    const { date } = req.body;
    const result = await generateDailyOrders(date);
    res.json({ message: 'Daily orders generation triggered', ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Manager: Cancel an order for a specific day (Subscription Skip)
router.post('/cancel-order', async (req, res) => {
  try {
    const { customerId, date, reason } = req.body;
    const skipSubscription = await SubscriptionSkip.create({
      customerId: customerId,
      dateOfSkip: date,
      startDate: date,
      endDate: date,
      reason: reason,
    });
    res.json({ message: 'Order cancelled successfully', skipSubscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
