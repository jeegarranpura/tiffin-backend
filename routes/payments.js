const express = require('express');
const router = express.Router();
const { Payment, Customer, Plan, Subscription } = require('../models');

// Create a Payment record against an existing subscription
router.post('/', async (req, res) => {
  try {
    const {
      subscriptionId, customerId, amount,
      paymentMethod, transactionId, notes, paymentDate
    } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required' });
    }

    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Update Subscription status to active
    await subscription.update({ status: 'active' });

    // Update Customer status to active
    await Customer.update(
      { status: 'active', isActive: true, planId: subscription.planId },
      { where: { id: customerId || subscription.customerId } }
    );

    // Create Payment record
    const payment = await Payment.create({
      customerId: customerId || subscription.customerId,
      planId: subscription.planId,
      subscriptionId: subscription.id,
      amount: amount || 0,
      type: subscription.planType === 'trial' ? 'trial' : 'monthly',
      paymentMethod: paymentMethod || 'cash',
      transactionId,
      notes: notes || 'Subscription payment',
      paymentDate: paymentDate || new Date(),
      expiryDate: subscription.endDate,
      status: 'completed'
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all Payments with details
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        { model: Customer, attributes: ['name', 'phone'] },
        { model: Plan, attributes: ['name'] },
        { model: Subscription }
      ],
      order: [['paymentDate', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment history for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { customerId: req.params.customerId },
      include: [Plan, Subscription],
      order: [['paymentDate', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update payment record
router.put('/:id', async (req, res) => {
  try {
    const {
      amount, type, paymentMethod, transactionId,
      notes, paymentDate, expiryDate, subscriptionId, status
    } = req.body;

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    await payment.update({
      amount, type, paymentMethod, transactionId,
      notes, paymentDate, expiryDate, subscriptionId, status
    });

    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update payment status (legacy route, redirects to main PUT)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    await payment.update({ status });
    res.json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
