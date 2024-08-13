import { registerAs } from '@nestjs/config';

export default registerAs(
    'redis',
    (): Record<string, any> => ({
        host: process.env.REDIS_HOST,
        port: Number.parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : null,
        cached: {
            ttl: 5 & 1000, // 5 mins
            max: 10,
        },
    })
);
