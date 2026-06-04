const {
  Customer,
  Plan,
  Order,
  Subscription,
  SubscriptionSkip,
  Route,
} = require("../models");
const { Op } = require("sequelize");

/**
 * Automatically generates daily orders for all active customers based on their plans.
 * @param {string} date - The date to generate orders for (YYYY-MM-DD). Defaults to today.
 */
async function generateDailyOrders(date = null) {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];
    console.log(
      `[OrderGenerator] Starting order generation for ${targetDate}...`,
    );

    // 1. Find all active subscriptions for the target date
    const activeSubscriptions = await Subscription.findAll({
      where: {
        startDate: { [Op.lte]: targetDate },
        endDate: { [Op.gte]: targetDate },
        status: "active",
      },
      include: [
        {
          model: Customer,
          where: { isActive: true },
          include: [Plan],
        },
        { model: Plan },
      ],
    });

    // 2. Find all skip records for the target date
    const skips = await SubscriptionSkip.findAll({
      where: { dateOfSkip: targetDate },
    });

    const skippedSubscriptionIds = skips.map((skip) => skip.subscriptionId);

    let createdCount = 0;
    let skippedCount = 0;

    for (const subscription of activeSubscriptions) {
      const customer = subscription.Customer;
      const plan = subscription.Plan || customer.Plan;

      if (skippedSubscriptionIds.includes(subscription.id)) {
        console.log(
          `[OrderGenerator] Subscription ${subscription.id} set to skip for ${targetDate}. Skipping.`,
        );
        skippedCount++;
        continue;
      }

      if (!plan) {
        console.warn(
          `[OrderGenerator] Customer ${customer.id} has no plan assigned. Skipping.`,
        );
        skippedCount++;
        continue;
      }

      const mealTimes = [];
      if (plan.mealTime === "Lunch" || plan.mealTime === "Both") {
        mealTimes.push("Lunch");
      }
      if (plan.mealTime === "Dinner" || plan.mealTime === "Both") {
        mealTimes.push("Dinner");
      }

      for (const time of mealTimes) {
        // Use findOrCreate to avoid duplicates if the script is run multiple times
        const [order, created] = await Order.findOrCreate({
          where: {
            customerId: customer.id,
            orderDate: targetDate,
            mealTime: time,
          },
          defaults: {
            type: customer.type === "regular" ? "monthly" : "trial",
            status: "pending",
            routeId: customer.routeId,
            priority: customer.priority,
          },
        });

        if (created) {
          createdCount++;
          const route = await Route.findByPk(customer.routeId);
          if (route) {
            route.status = "pending";
            await route.save();
            console.warn(
              `[OrderGenerator] Route - ${route.name} status updated.`,
            );
          }
        }
      }
    }

    const orderWhere = { orderDate: targetDate };
    const routes = await Route.findAll({
      include: [
        {
          model: Order,
          where: orderWhere,
          required: false
        },
      ],
    });
    for (const route of routes) {
      if (route.Orders.length <= 0) {
        await Route.update({ status: "pending" }, { where: { id: route.id } });
        console.warn(`[OrderGenerator] Route - ${route.name} status updated.`);
      }
    }

    console.log(
      `[OrderGenerator] Completed. Created: ${createdCount}, Skipped: ${skippedCount}`,
    );
    return { createdCount, skippedCount };
  } catch (error) {
    console.error("[OrderGenerator] Error generating orders:", error);
    throw error;
  }
}

module.exports = { generateDailyOrders };
