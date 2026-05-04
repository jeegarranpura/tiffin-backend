const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { sequelize } = require('./models');
const { authMiddleware } = require('./middleware/auth');
const { processPaymentReminders } = require('./routes/reminders');
require('dotenv').config();

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: ['http://localhost:5173', 'http://192.168.1.72:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'https://tiffin-admin-z9yl.onrender.com'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const socketHandler = require('./utils/socketHandler');

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://192.168.1.72:5173', 'http://127.0.0.1:5173', 'https://tiffin-admin-z9yl.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use('/uploads', express.static('uploads'));

// Import Routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/uploads');
const planRoutes = require('./routes/plans');
const customerRoutes = require('./routes/customers');
const routeManagementRoutes = require('./routes/routes');
const packingRoutes = require('./routes/packing');
const deliveryRoutes = require('./routes/delivery');
const reportRoutes = require('./routes/reports');
const paymentRoutes = require('./routes/payments');
const orderRoutes = require('./routes/orders');
const subscriptionRoutes = require('./routes/subscriptions');
const users = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const reminderRoutes = require('./routes/reminders');
const { generateDailyOrders } = require('./utils/orderGenerator');
const { updateSubscriptionStatus } = require('./utils/subscriptionService');



// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);

// Protected Routes
app.use('/api/plans', authMiddleware, planRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/routes', authMiddleware, routeManagementRoutes);
app.use('/api/packing', authMiddleware, packingRoutes);
app.use('/api/delivery', authMiddleware, deliveryRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);
app.use('/api/users', authMiddleware, users);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/reminders', authMiddleware, reminderRoutes);


app.get('/', (req, res) => {
    res.send('Tiffin Delivery API is running...');
});

// Initialize Socket.io Handler
socketHandler(io);



const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`;
generateDailyOrders(formattedDate)

// Cron Job: Generate daily orders at 10:30 PM/
cron.schedule('00 11 * * *', async () => {
    console.log('Running daily order generation cron job at 10:30 PM');
    try {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate() + 1).padStart(2, '0');
        const tomorrow = `${year}-${month}-${day}`;
        const result = await generateDailyOrders(tomorrow);
        console.log(`Order generation completed. Created: ${result.createdCount}, Skipped: ${result.skippedCount}`);
    } catch (error) {
        console.error('Order generation cron job failed:', error);
    }
});

// Cron Job: Payment Reminders at 11 AM daily
cron.schedule('00 11 * * *', async () => {
    console.log('Running daily payment reminder cron job at 11:00 AM');
    try {
        const results = await processPaymentReminders();
        console.log(`Cron job completed: ${results.length} reminders processed.`);
    } catch (error) {
        console.error('Cron job failed:', error);
    }
});

// Cron Job: Subscription Status Update at 11 AM daily
cron.schedule('00 11 * * *', async () => {
    console.log('Running daily subscription status update cron job at 11:00 AM');
    try {
        const results = await updateSubscriptionStatus();
        console.log(`Cron job completed: ${results.length} subscriptions updated.`);
    } catch (error) {
        console.error('Cron job failed:', error);
    }
});

const PORT = process.env.PORT || 8080;


const syncDatabase = async () => {
    try {
        // One-time fix for existing string columns that need to be UUID for foreign keys
        // We null them out if they aren't valid UUIDs to avoid cast errors
        await sequelize.query(`
            DO $$ 
            BEGIN 
                -- Fix Routes.assignedTo
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Routes' AND column_name = 'assignedTo' AND data_type = 'character varying') THEN
                    ALTER TABLE "Routes" ALTER COLUMN "assignedTo" TYPE UUID USING (CASE WHEN "assignedTo" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "assignedTo"::UUID ELSE NULL END);
                END IF;

                -- Fix Deliveries.agentId
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Deliveries' AND column_name = 'agentId' AND data_type = 'character varying') THEN
                    ALTER TABLE "Deliveries" ALTER COLUMN "agentId" TYPE UUID USING (CASE WHEN "agentId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "agentId"::UUID ELSE NULL END);
                END IF;
            END $$;
        `);

        await sequelize.sync({ alter: true });
        console.log('Database synced');
        http.listen(PORT, '0.0.0.0', () => {
            console.log(`Server started on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to sync database:', err);
    }
};

syncDatabase();
