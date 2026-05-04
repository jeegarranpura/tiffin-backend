const express = require('express');
const router = express.Router();
const { Route, Customer, Order, User, Plan, Delivery, Subscription } = require('../models');
const { Op } = require('sequelize');

// Create a Route Manually
router.post('/', async (req, res) => {
  try {
    const { name, description, type, assignedTo, customerIds } = req.body;
    const route = await Route.create({ name, description, type, assignedTo });
    if (customerIds && customerIds.length > 0) {
      await Promise.all(customerIds.map(async (customerId, index) => {
        const priority = index + 1;
        await Customer.update(
          { routeId: route.id, priority },
          { where: { id: customerId } }
        );
      }));
    }
    res.status(201).json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all Routes with assigned orders for a specific date
router.get('/', async (req, res) => {
  try {
    const { date, mealTime } = req.query;
    // Default to today's date (YYYY-MM-DD)
    const filterDate = date || new Date().toISOString().split('T')[0];

    const orderWhere = { orderDate: filterDate };
    if (mealTime) orderWhere.mealTime = mealTime;

    const routes = await Route.findAll({
      include: [
        {
          model: Order,
          where: orderWhere,
          required: ['admin', 'manager'].includes(req.user.role) ? false : true, // Only return routes that have orders for the specified date
          include: [
            { model: Customer, as: 'Customer', include: [Plan] },
            { model: Delivery }
          ]
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'username']
        }
      ],
      order: [[Order, Customer, 'priority', 'ASC']]
    });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Get single Route details for a specific date
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, mealTime } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];

    const orderWhere = { orderDate: filterDate };
    if (mealTime) orderWhere.mealTime = mealTime;

    const route = await Route.findOne({
      where: { id },
      include: [
        {
          model: Order,
          where: orderWhere,
          required: false,
          include: [Customer, Delivery]
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'username']
        }
      ],
      order: [[Order, Customer, 'priority', 'ASC']]
    });
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Route details
router.put('/:id', async (req, res) => {
  try {
    const { name, description, type, assignedTo, status, customerIds } = req.body;
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    await route.update({ name, description, type, assignedTo, status });
    if (customerIds && customerIds.length > 0) {
      await Promise.all(customerIds.map(async (customerId, index) => {
        const priority = index + 1;
        await Customer.update(
          { routeId: route.id, priority },
          { where: { id: customerId } }
        );
      }));
    }
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Route details for Map (Filtered by Date and Ordered by Priority)
router.get('/:id/map', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, mealTime } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];

    const orderWhere = {
      status: { [Op.ne]: 'cancelled' },
      orderDate: filterDate
    };
    if (mealTime) orderWhere.mealTime = mealTime;

    const route = await Route.findByPk(id, {
      include: [
        {
          model: Order,
          where: orderWhere,
          required: false,
          include: [Customer, Delivery]
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'username']
        }
      ],
      order: [[Order, Customer, 'priority', 'ASC']]
    });

    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const route = await Route.findByPk(id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    await route.destroy();
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/update-route-status/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    await route.update({ status });
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
