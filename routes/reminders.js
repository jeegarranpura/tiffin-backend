const express = require('express');
const router = express.Router();
const { Subscription, Customer, Payment } = require('../models');
const { Op } = require('sequelize');
const { sendEmail, getPaymentReminderTemplate } = require('../utils/emailService');

const processPaymentReminders = async (useMailinator = true) => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Find subscriptions ending tomorrow that are active
        const expiringSubs = await Subscription.findAll({
            where: {
                endDate: tomorrowStr,
                status: 'active'
            },
            include: [Customer]
        });


        const results = [];
        for (const sub of expiringSubs) {
            const customer = sub.Customer;
            if (customer && customer.name) {
                const testEmail = `${customer.name.replace(/\s/g, '') || 'user'}@mailinator.com`;
                const adminMails = process.env.ADMIN_MAILS ? process.env.ADMIN_MAILS.split(',').map(m => m.trim()) : [];
                const emailToUse = useMailinator ? [testEmail, ...adminMails] : customer.email;
                const amount = 500;
                if (process.env.NODE_ENV !== 'production') {
                    const html = getPaymentReminderTemplate(customer.name, sub.endDate, amount);
                    await sendEmail(emailToUse, 'Payment Reminder - Your Tiffin Plan Expires Tomorrow', html);
                }

                results.push({ customer: customer.name, email: emailToUse, status: 'sent' });
            }
        }
        return results;
    } catch (error) {
        console.error('Reminder Processing Error:', error);
        throw error;
    }
};

// Send payment reminders for subscriptions ending tomorrow
router.post('/send-upcoming-reminders', async (req, res) => {
    try {
        const results = await processPaymentReminders(req.body.useMailinator);
        res.json({
            message: `Processed ${results.length} reminders`,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
module.exports.processPaymentReminders = processPaymentReminders;
