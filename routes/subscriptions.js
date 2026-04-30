const express = require('express');
const router = express.Router();
const { Subscription, SubscriptionSkip, Customer, Plan, Payment } = require('../models');

// Create a Subscription along with its initial Payment
router.post('/', async (req, res) => {
  try {
    const {
      customerId, planId, planType, startDate, endDate, status,
      amount, paymentMethod, transactionId, notes
    } = req.body;

    // Deactivate previous active/pending subscriptions for this customer (Commented out to allow multiple active)
    await Subscription.update(
      { status: 'expired' },
      { where: { customerId, status: ['active', 'pending_payment'] } }
    );

    let calculatedEndDate = endDate;
    if (planId && !endDate) {
      const plan = await Plan.findByPk(planId);
      if (plan) {
        const start = startDate ? new Date(startDate) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + (plan.durationDays || 30));
        calculatedEndDate = end;
      }
    } else if (planType === 'trial' && !endDate) {
      const start = startDate ? new Date(startDate) : new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      calculatedEndDate = end;
    }

    const subscription = await Subscription.create({
      customerId,
      planId: planId || null,
      planType,
      startDate: startDate || new Date(),
      endDate: calculatedEndDate,
      status: status || 'active'
    });

    // Create Payment linked to this subscription
    if (amount !== undefined) {
      await Payment.create({
        customerId,
        planId: planId || null,
        subscriptionId: subscription.id,
        amount: amount || 0,
        type: planType,
        paymentMethod: paymentMethod || 'cash',
        transactionId,
        notes: notes || 'Subscription onboarding/renewal',
        paymentDate: new Date(),
        expiryDate: calculatedEndDate,
        status: 'completed'
      });
    }

    // Activate Customer
    await Customer.update({ isActive: true, status: 'active' }, { where: { id: customerId } });

    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all Customer with Subscriptions
router.get('/', async (req, res) => {
  try {
    const subscriptions = await Customer.findAll({
      include: [{
        model: Subscription,
        include: [Payment, Plan]
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscription history for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { customerId: req.params.customerId },
      include: [Plan],
      order: [['startDate', 'DESC']]
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a Subscription record
router.put('/:id', async (req, res) => {
  try {
    const {
      planId, planType, startDate, endDate, status,
      amount, paymentMethod, transactionId, notes
    } = req.body;

    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

    await subscription.update({
      planId, planType, startDate, endDate, status
    });

    // Sync Payment record if payment data provided
    if (amount !== undefined || transactionId !== undefined) {
      const payment = await Payment.findOne({ where: { subscriptionId: subscription.id } });
      if (payment) {
        await payment.update({
          amount: amount !== undefined ? amount : payment.amount,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : payment.paymentMethod,
          transactionId: transactionId !== undefined ? transactionId : payment.transactionId,
          notes: notes !== undefined ? notes : payment.notes,
          expiryDate: endDate !== undefined ? endDate : payment.expiryDate
        });
      } else {
        await Payment.create({
          customerId: subscription.customerId,
          planId: subscription.planId,
          subscriptionId: subscription.id,
          amount: amount || 0,
          type: planType || subscription.planType,
          paymentMethod: paymentMethod || 'cash',
          transactionId,
          notes: notes || 'Subscription onboarding/renewal',
          paymentDate: new Date(),
          expiryDate: endDate || subscription.endDate,
          status: 'completed'
        });
      }
    }

    // Ensure customer is active if subscription is active
    if (status === 'active') {
      await Customer.update({ isActive: true, status: 'active' }, { where: { id: subscription.customerId } });
    }

    res.json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a Subscription Skip
router.post('/skip', async (req, res) => {
  try {
    const { subscriptionId, dateOfSkip, reason } = req.body;
    const skip = await SubscriptionSkip.create({
      subscriptionId, dateOfSkip, reason
    });
    res.status(201).json(skip);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all Skip records
router.get('/skips', async (req, res) => {
  try {
    const skips = await SubscriptionSkip.findAll({
      include: [Subscription]
    });
    res.json(skips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a Subscription
router.delete('/:id', async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

    // Also delete associated payments if needed, or just let it be. 
    // Usually, we keep payments for auditing but if hard deleting subscription, maybe delete pending payments.
    await Payment.destroy({ where: { subscriptionId: subscription.id, status: 'pending' } });

    await subscription.destroy();
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
