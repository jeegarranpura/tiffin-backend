const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
    console.log('Sending email to:', to);

    try {
        // Dummy transporter for testing - in production use real SMTP
        // Since the user mentioned Mailinator, they probably want to see emails there.
        // I'll use a test account if possible, or just log if no SMTP is provided.

        let transporter;
        if (process.env.SMTP_HOST) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_PORT == 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        } else {
            // Fallback to Ethereal for testing if no real SMTP
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log('Testing Email: No SMTP configured, using Ethereal. Preview URL: ' + nodemailer.getTestMessageUrl({ to, subject, html }));
        }

        const info = await transporter.sendMail({
            from: '"Tiffin Service" <noreply@tiffinservice.com>',
            to,
            subject,
            html,
        });

        console.log('Email sent: %s', info);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

const getPaymentReminderTemplate = (customerName, expiryDate, amount) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Payment Reminder</h1>
            </div>
            <div style="padding: 30px; line-height: 1.6; color: #1e293b;">
                <p>Hello <strong>${customerName}</strong>,</p>
                <p>This is a friendly reminder that your tiffin subscription is set to expire on <strong>${expiryDate}</strong>.</p>
                <p>To avoid any interruption in your delicious daily meals, please renew your plan.</p>
                
                <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb;">
                    <p style="margin: 0; font-size: 14px; font-weight: bold; color: #64748b; text-transform: uppercase;">Amount Due</p>
                    <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #0f172a;">₹${amount}</p>
                </div>

                <p>You can pay via Cash at the time of delivery or use our online portal.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now</a>
                </div>
            </div>
            <div style="background-color: #f1f5f9; color: #64748b; padding: 15px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">&copy; 2026 Aegis Tiffin Service. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">If you've already paid, please ignore this email.</p>
            </div>
        </div>
    `;
};

module.exports = { sendEmail, getPaymentReminderTemplate };
