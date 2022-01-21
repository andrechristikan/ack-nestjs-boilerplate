import { registerAs } from '@nestjs/config';

export default registerAs(
    'middleware',
    (): Record<string, any> => ({
        cors: {
            allowMethod: [
                'GET',
                'HEAD',
                'OPTIONS',
                'DELETE',
                'PUT',
                'PATCH',
                'POST',
                'OPTIONS',
            ],
            allowOrigin: '*',
            allowHeader: [
                'Accept',
                'App-Languages',
                'Origin',
                'Authorization',
                'Accept',
                'X-Requested-With',
                'Content-Type',
                'Access-Control-Request-Method',
                'Access-Control-Request-Headers',
            ],
        },
        rateLimit: {
            resetTime: 1 * 60 * 1000,
            maxRequestPerId: 10,
        },
    })
);
