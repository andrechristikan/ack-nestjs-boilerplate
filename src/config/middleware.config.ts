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
            ],
            allowOrigin: ['*'],
        },
        rateLimit: {
            resetTime: 1 * 60 * 1000,
            maxRequestPerId: 10,
        },
    })
);
