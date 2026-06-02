const express = require('express');
const router = express.Router();
const { Route, Order, Delivery, User } = require('../models');
const { Op } = require('sequelize');
const { sendNotification } = require('../utils/firebaseServices');



// Delivery Agent: Start Delivery
router.post('/start/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { agentId } = req.body;

    const route = await Route.findByPk(routeId);
    if (!route) {
      return res.status(400).json({ error: 'Route not ready or not found' });
    }

    await route.update({ status: 'in-progress', assignedTo: agentId });

    // Mark all orders on this route as picked-up
    const today = new Date().toISOString().split('T')[0];
    const orders = await Order.findAll({ where: { routeId, orderDate: today, status: 'packed' } });

    await Promise.all(orders.map(order =>
      Delivery.create({ orderId: order.id, agentId, status: 'picked-up' })
    ));

    const users = await User.findAll({
      where: {
        role: ['admin', 'manager']
      }
    });

    users.filter(async (usr) => {
      if (usr.fcmToken) {
        const routeTitle = route.name;
        await sendNotification(usr.fcmToken, `Delivery Started for ${routeTitle} the Route :`, 'Delivery Started...', usr);
      }
    })

    res.json({ message: 'Delivery started', route });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delivery Agent: Complete Delivery
router.post('/complete/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { homePhoto, tiffinPhoto } = req.body;

    const delivery = await Delivery.findOne({ where: { orderId } });
    if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

    await delivery.update({
      homePhoto,
      tiffinPhoto,
      status: 'delivered'
    });

    await Order.update({ status: 'delivered', deliveryTime: new Date() }, { where: { id: orderId } });

    // Check if route is completed
    const order = await Order.findByPk(orderId);
    const pendingOrders = await Order.count({
      where: { routeId: order.routeId, orderDate: order.orderDate, status: { [Op.ne]: 'delivered' } }
    });

    if (pendingOrders === 0) {
      await Route.update({ status: 'completed' }, { where: { id: order.routeId } });
    }

    const route  = await Route.find({ where: { id: order.routeId } });
    const users = await User.findAll({
      where: {
        role: ['admin', 'manager']
      }
    });

    users.filter(async (usr) => {
      if (usr.fcmToken) {
        const routeTitle = route.name;
        await sendNotification(usr.fcmToken, `Order Delivered for ${routeTitle} the Route :`, 'Delivery Completed...', usr);
      }
    })

    res.json({ message: 'Delivery completed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Live Location
router.post('/location/:routeId', async (req, res) => {
  const { routeId } = req.params;
  const { lat, lng, agentId } = req.body;

  // Here we would typically emit via Socket.io
  // For now, let's just log or update a central record
  console.log(`Location update for agent ${agentId} on route ${routeId}: ${lat}, ${lng}`);

  // Optional: Update last delivery record with current location
  // Delivery.update({ currentLat: lat, currentLong: lng }, { where: { ... } });

  res.json({ status: 'ok' });
});

module.exports = router;
