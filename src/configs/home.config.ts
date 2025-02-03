import { registerAs } from '@nestjs/config';

export default registerAs(
    'home',
    (): Record<string, any> => ({
        name: process.env.HOME_NAME,
        url: process.env.HOME_URL,
    })
);
