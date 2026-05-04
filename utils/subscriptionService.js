const { Customer, Plan, Order, Subscription, SubscriptionSkip, Route } = require('../models');
const { Op } = require('sequelize');


async function updateSubscriptionStatus() {

    const today = new Date().toISOString().split('T')[0];
    const subscriptions = await Subscription.findAll({
        where: {
            status: 'active',
            endDate: {
                [Op.lt]: today
            }
        }
    });

    for (const subscription of subscriptions) {
        subscription.status = 'expired';
        await subscription.save();
    }

    console.log(`[SubscriptionService] Updated ${subscriptions.length} subscriptions to expired.`);
    return subscriptions;

}


module.exports = { updateSubscriptionStatus };