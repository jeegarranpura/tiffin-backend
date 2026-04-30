const express = require('express');
const router = express.Router();
const { Plan } = require('../models');

// Create a Monthly Plan
router.post('/', async (req, res) => {
  try {
    const { name, description, pricing, durationDays, type, mealTime, items, isActive, rules } = req.body;
    const plan = await Plan.create({ name, description, pricing, durationDays, type, mealTime, items, isActive, rules });
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all Plans
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.findAll();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a Plan by ID
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a Plan
router.put('/:id', async (req, res) => {
  try {
    const { name, description, pricing, durationDays, type, mealTime, items, isActive, rules } = req.body;
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    await plan.update({ name, description, pricing, durationDays, type, mealTime, items, isActive, rules });
    res.json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a Plan
router.delete('/:id', async (req, res) => {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    await plan.destroy();
    res.json({ message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
