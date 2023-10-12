import { registerAs } from '@nestjs/config';

export default registerAs(
    'email',
    (): Record<string, any> => ({
        clientId: process.env.SSO_GOOGLE_CLIENT_ID,
        clientSecret: process.env.SSO_GOOGLE_CLIENT_SECRET,
    })
);
