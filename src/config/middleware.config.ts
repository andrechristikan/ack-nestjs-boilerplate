import { registerAs } from '@nestjs/config';

export default registerAs(
    'middleware',
    (): Record<string, any> => ({
        cors: {
            allowMethod: ['GET', 'DELETE', 'PUT', 'PATCH', 'POST'],
            allowOrigin: '*',
            allowHeader: [
                'Accept',
                'accept-language',
                'Origin',
                'Authorization',
                'Content-Type',
            ],
        },
        rateLimit: {
            resetTime: 1 * 60 * 1000,
            maxRequestPerId: 10,
        },
    })
);
