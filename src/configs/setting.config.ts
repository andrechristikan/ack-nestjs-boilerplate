import { registerAs } from '@nestjs/config';

export default registerAs(
    'setting',
    (): Record<string, any> => ({
        keyPrefix: 'Setting',
        ttl: 60 * 60 * 24 * 1000,
    })
);
