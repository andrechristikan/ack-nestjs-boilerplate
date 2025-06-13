import { registerAs } from '@nestjs/config';

export default registerAs(
    'setting',
    (): Record<string, any> => ({
        keyPrefix: 'Setting',
    })
);
