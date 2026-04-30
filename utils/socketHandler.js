const jwt = require('jsonwebtoken');
const { Order, Customer } = require('../models');

// Helper to calculate distance between two coordinates in KM
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

// Cache to store the most recent location for each route
const lastKnownLocations = {};

const socketHandler = (io) => {
    // Authentication Middleware for Socket.io
    io.use((socket, next) => {
        // Try getting token from auth object or handshake query
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            console.log('Socket Connection Denied: No token provided');
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            console.log('Socket Connection Denied: Invalid token');
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const { id, role, name } = socket.user;
        console.log(`User connected: ${name} (${role}) - Socket ID: ${socket.id}`);

        // Join role-specific rooms
        if (role === 'admin' || role === 'manager') {
            socket.join('admin-manager-updates');
            console.log(`${name} joined admin-manager-updates room`);
        }

        // Handle delivery agent joining a route
        socket.on('join-route', (routeId) => {
            socket.join(`route-${routeId}`);
            console.log(`${name} joined route-${routeId}`);

            // If we have a last known location for this route, semi-instantly send it to the joining user
            if (lastKnownLocations[routeId]) {
                console.log(`[Socket] Sending last known location for route ${routeId} to ${name}`);
                socket.emit('update-location', lastKnownLocations[routeId]);
            }
        });

        // Agent sends location update
        // Expectations: { routeId, lat, lng }
        socket.on('update-location', async (data) => {
            const { routeId, lat, lng } = data;
            const agentLat = parseFloat(lat);
            const agentLng = parseFloat(lng);
            console.log('data', data);

            const locationData = {
                userId: id,
                agentName: name,
                routeId: routeId || 'unassigned',
                lat: agentLat,
                lng: agentLng,
                timestamp: new Date()
            };

            // Update cache
            if (routeId) {
                lastKnownLocations[routeId] = locationData;
            }

            // Check if agent has reached any stops on this route
            if (routeId) {
                try {
                    const pendingOrders = await Order.findAll({
                        where: { routeId, status: 'packed' }, // Assuming 'packed' means out for delivery
                        include: [{ model: Customer }]
                    });

                    for (const order of pendingOrders) {
                        if (order.Customer && order.Customer.latitude && order.Customer.longitude) {
                            const dist = getDistance(
                                agentLat,
                                agentLng,
                                parseFloat(order.Customer.latitude),
                                parseFloat(order.Customer.longitude)
                            );

                            // If within 100 meters (0.1 km)
                            if (dist < 0.1) {
                                await order.update({ status: 'delivered', deliveryTime: new Date() });
                                console.log(`Auto-marked order ${order.id} as delivered (proximity: ${dist.toFixed(3)}km)`);

                                // Notify route room that a stop was reached
                                io.to(`route-${routeId}`).emit('stop-reached', {
                                    orderId: order.id,
                                    customerId: order.Customer.id,
                                    status: 'delivered'
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error checking proximity in socketHandler:', err);
                }
            }

            // 1. Broadcast to specific route room (for specific route monitoring)
            if (routeId) {
                io.to(`route-${routeId}`).emit('update-location', locationData);
            }

            // 2. Broadcast to all admins and managers (global live tracking dashboard)
            io.to('admin-manager-updates').emit('delivery-location-changed', locationData);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${name} (${role})`);
        });
    });
};

module.exports = socketHandler;
