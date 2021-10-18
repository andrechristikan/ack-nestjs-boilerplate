import { registerAs } from '@nestjs/config';

export default registerAs(
    'database',
    (): Record<string, any> => ({
        host: process.env.DATABASE_HOST || 'localhost:27017',
        name: process.env.DATABASE_NAME || 'ack',
        user: process.env.DATABASE_USER || null,
        password: process.env.DATABASE_PASSWORD || null,
        admin: process.env.DATABASE_ADMIN === 'true' ? true : false,
        srv: process.env.DATABASE_SRV === 'true' ? true : false,
        ssl: process.env.DATABASE_SSL === 'true' ? true : false,
        debug: process.env.DATABASE_DEBUG === 'true' || false,
        options: process.env.DATABASE_OPTIONS
    })
);
