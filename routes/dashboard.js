const express = require('express');
const router = express.Router();
const { Customer, Subscription, Order, Payment, Plan, sequelize } = require('../models');
const { Op } = require('sequelize');

router.get('/overview', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Stats Summary
    const totalCustomers = await Customer.count();
    const activeSubscriptions = await Subscription.count({ where: { status: 'active' } });
    const todayDeliveries = await Order.count({ where: { orderDate: today } });
    const pendingDeliveries = await Order.count({
      where: {
        orderDate: today,
        status: 'pending'
      }
    });

    // 2. Recent Activity - Latest 10 orders with Customer details
    const recentActivity = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{ model: Customer, attributes: ['name', 'type'] }]
    });

    // Format recent activity for frontend
    const formattedActivity = recentActivity.map(order => ({
      customer: order.Customer ? order.Customer.name : 'Unknown',
      activity: `${order.mealTime} - ${order.Customer.type === 'trial' ? 'Trial' : 'Monthly'} Order`,
      status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
      time: order.createdAt,
      statusColor: getStatusColor(order.status)
    }));

    // 3. Delivery Trend (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const deliveryTrendRows = await Order.findAll({
      attributes: [
        'orderDate',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        orderDate: {
          [Op.gte]: sevenDaysAgo.toISOString().split('T')[0]
        }
      },
      group: ['orderDate'],
      order: [['orderDate', 'ASC']],
      raw: true
    });

    // 4. Revenue Overview (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start of the month

    const revenueOverviewRows = await Payment.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('paymentDate')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        paymentDate: { [Op.gte]: sixMonthsAgo },
        status: 'completed'
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('paymentDate'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('paymentDate')), 'ASC']],
      raw: true
    });

    res.json({
      stats: [
        { label: 'Total Customers', value: totalCustomers.toLocaleString(), change: '+0%', positive: true, icon: 'group' },
        { label: 'Active Subscriptions', value: activeSubscriptions.toLocaleString(), change: '+0%', positive: true, icon: 'card_membership' },
        { label: "Today's Deliveries", value: todayDeliveries.toLocaleString(), change: '+0%', positive: true, icon: 'local_shipping' },
        { label: 'Pending Deliveries', value: pendingDeliveries.toLocaleString(), change: 'Stable', neutral: true, icon: 'schedule' },
      ],
      recentActivity: formattedActivity,
      deliveryTrend: deliveryTrendRows,
      revenueOverview: revenueOverviewRows
    });
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    res.status(500).json({ error: error.message });
  }
});

function getStatusColor(status) {
  switch (status) {
    case 'delivered': return 'blue';
    case 'packed': return 'green';
    case 'pending': return 'yellow';
    case 'failed': return 'red';
    case 'cancelled': return 'slate';
    default: return 'slate';
  }
}

module.exports = router;
