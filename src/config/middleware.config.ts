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
                'user-agent',
            ],
        },
        rateLimit: {
            resetTime: 1 * 500, // 0.5 secs
            maxRequestPerId: 1, // max request per reset time
        },
        timestamp: {
            toleranceTimeInMinutes: process.env.APP_TOLERANCE_TIMESTAMP || 5, // 5 mins
        },
    })
);
