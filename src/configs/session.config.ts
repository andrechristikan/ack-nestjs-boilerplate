import { registerAs } from '@nestjs/config';

export default registerAs(
    'session',
    (): Record<string, any> => ({
        keyPrefix: 'UserLogin',
    })
);
