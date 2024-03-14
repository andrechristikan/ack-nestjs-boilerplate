import { registerAs } from '@nestjs/config';

export default registerAs(
    'apple',
    (): Record<string, any> => ({
        certP8Path: './data/SignInApple_AuthKey.p8',
        clientId: process.env.SSO_APPLE_CLIENT_ID,
        teamId: process.env.SSO_APPLE_TEAM_ID,
        keyId: process.env.SSO_APPLE_KEY_ID,
        callbackUrl: process.env.SSO_APPLE_CALLBACK_URL,
    })
);
