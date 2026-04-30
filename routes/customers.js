const express = require('express');
const router = express.Router();
const { Customer, Plan, Subscription } = require('../models');

// Add a Customer
router.post('/', async (req, res) => {
  try {
    const {
      name, phone, address, latitude, longitude,
      type, planId, routeId, priority,
      startDate, endDate
    } = req.body;

    const customer = await Customer.create({
      name, phone, address, latitude, longitude,
      type, planId, routeId, priority,
      status: 'payment pending',
      isActive: false
    });

    // Create initial subscription
    if (planId || startDate || endDate) {
      await Subscription.create({
        customerId: customer.id,
        planId: planId || null,
        planType: type || 'monthly',
        startDate: startDate || new Date(),
        endDate: endDate || null,
        status: 'pending_payment'
      });
    }

    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all Customers with their Plan details
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      include: [
        { model: Plan, attributes: ['name', 'id', 'durationDays'] },
        { model: Subscription, order: [['createdAt', 'DESC']] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Customer details
router.put('/:id', async (req, res) => {
  try {
    const {
      name, phone, address, latitude, longitude,
      type, planId, routeId, priority, isActive, status,
      startDate, endDate, subscriptionId
    } = req.body;

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    await customer.update({
      name, phone, address, latitude, longitude,
      type, planId, routeId, priority,
      isActive: isActive !== undefined ? isActive : customer.isActive,
      status: status !== undefined ? status : customer.status
    });

    // If subscriptionId is provided, update that specific subscription
    if (subscriptionId) {
      const subscription = await Subscription.findByPk(subscriptionId);
      if (!subscription || subscription.customerId !== customer.id) {
        return res.status(400).json({ error: 'Invalid subscriptionId for this customer' });
      }

      await subscription.update({
        planId: planId || subscription.planId,
        planType: type || subscription.planType,
        startDate: startDate || subscription.startDate,
        endDate: endDate || subscription.endDate
      });
    }
    // Otherwise, if new plan/dates are provided without an ID, follow the renewal logic
    else if (planId || startDate || endDate) {
      // Expire current active/pending subscriptions
      await Subscription.update(
        { status: 'expired' },
        { where: { customerId: customer.id, status: ['active', 'pending_payment'] } }
      );

      // Create new subscription record
      await Subscription.create({
        customerId: customer.id,
        planId: planId || customer.planId,
        planType: type || customer.type,
        startDate: startDate || new Date(),
        endDate: endDate || null,
        status: 'pending_payment'
      });

      // Reset customer status to payment pending on plan change
      await customer.update({ status: 'payment pending', isActive: false });
    }

    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
