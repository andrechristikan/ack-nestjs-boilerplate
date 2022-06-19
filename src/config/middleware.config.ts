import { registerAs } from '@nestjs/config';

export default registerAs(
    'middleware',
    (): Record<string, any> => ({
        cors: {
            allowMethod: ['GET', 'DELETE', 'PUT', 'PATCH', 'POST'],
            allowOrigin: '*',
            // allowOrigin: [/example\.com(\:\d{1,4})?$/], // allow all subdomain, and all port
            // allowOrigin: [/example\.com$/], // allow only subdomain
            allowHeader: [
                'Accept',
                'Accept-Language',
                'Content-Language',
                'Content-Type',
                'Origin',
                'Authorization',
                'Access-Control-Request-Method',
                'Access-Control-Request-Headers',
                'Access-Control-Allow-Headers',
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Credentials',
                'Access-Control-Expose-Headers',
                'Access-Control-Max-Age',
                'Referer',
                'Host',
                'X-Requested-With',
                'x-custom-lang',
                'x-timestamp',
                'x-api-key',
                'x-timezone',
                'x-request-id',
                'user-agent',
            ],
        },
        rateLimit: {
            resetTime: 1 * 500, // 0.5 secs
            maxRequestPerId: 1, // max request per reset time
        },
        timestamp: {
            toleranceTimeInMinutes:
                Number.parseInt(process.env.MIDDLEWARE_TOLERANCE_TIMESTAMP) ||
                5, // 5 mins
        },
        cache: {
            ttl: 30, // 30sec
            max: 5, // maximum number of items in cache
        },
        timeout: {
            in: process.env.MIDDLEWARE_TIMEOUT
                ? parseInt(process.env.MIDDLEWARE_TIMEOUT) * 1000
                : 30 * 1000, // 30s based on ms module
        },
    })
);
