import { registerAs } from '@nestjs/config';

export default registerAs(
    'google',
    (): Record<string, any> => ({
        clientId: process.env.SSO_GOOGLE_CLIENT_ID,
        clientSecret: process.env.SSO_GOOGLE_CLIENT_SECRET,
        callbackSignUpUrl: process.env.SSO_GOOGLE_CALLBACK_URL_SIGN_UP,
        callbackLoginUrl: process.env.SSO_GOOGLE_CALLBACK_URL_LOGIN,
    })
);
