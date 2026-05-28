// const { RateLimiterRedis } = require("rate-limiter-flexible");
// const { redis } = require('./redisService');



// const rateLimitMiddleware = new RateLimiterRedis({
//     storeClient: redis,
//     points: 100,
//     duration: 60,
//     keyPrefix: 'rate-limit'
// });


// const loginRateLimit = new RateLimiterRedis({
//     storeClient: redis,
//     points: 5,
//     duration: 900, // 15 minutes
//     keyPrefix: 'login-rate-limit'
// })


// module.exports = { rateLimitMiddleware, loginRateLimit };