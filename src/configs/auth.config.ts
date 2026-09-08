import { registerAs } from '@nestjs/config';
import ms from 'ms';
import { Algorithm } from 'jsonwebtoken';
import { HashAlgorithm, OTPStrategy } from 'otplib';

export interface IConfigAuth {
    jwt: {
        accessToken: {
            jwksUri: string;
            kid: string;
            algorithm: Algorithm;
            privateKey: string;
            publicKey: string;
            expirationTimeInSeconds: number;
        };
        refreshToken: {
            jwksUri: string;
            kid: string;
            algorithm: Algorithm;
            privateKey: string;
            publicKey: string;
            expirationTimeInSeconds: number;
        };
        audience: string;
        issuer: string;
        header: string;
        prefix: string;
    };
    password: {
        attempt: boolean;
        maxAttempt: number;
        saltLength: number;
        expiredInMs: number;
        expiredTemporaryInMs: number;
        periodInDays: number;
    };
    apple: {
        header: string;
        prefix: string;
        clientId: string | null;
        signInClientId: string | null;
    };
    google: {
        header: string;
        prefix: string;
        clientId: string | null;
        clientSecret: string | null;
    };
    xApiKey: {
        header: string;
        keyPattern: string;
    };
    twoFactor: {
        strategy: OTPStrategy;
        algorithm: HashAlgorithm;
        issuer: string;
        digits: number;
        periodInSeconds: number;
        window: number;
        secretLength: number;
        challengeTtlInMs: number;
        challengeKeyPattern: string;
        lockKeyPattern: string;
        maxAttempt: number;
        lockAttemptDurationInMs: number;
        backupCodes: {
            count: number;
            length: number;
        };
        encryption: {
            key: string;
        };
    };
}

export default registerAs('auth', (): IConfigAuth => ({
    jwt: {
        accessToken: {
            jwksUri: process.env.AUTH_JWT_ACCESS_TOKEN_JWKS_URI!,
            kid: process.env.AUTH_JWT_ACCESS_TOKEN_KID!,
            algorithm: 'ES256',
            privateKey: process.env.AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY!,
            publicKey: process.env.AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY!,
            expirationTimeInSeconds:
                ms(
                    process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED! as ms.StringValue
                ) / 1000,
        },

        refreshToken: {
            jwksUri: process.env.AUTH_JWT_REFRESH_TOKEN_JWKS_URI!,
            kid: process.env.AUTH_JWT_REFRESH_TOKEN_KID!,
            algorithm: 'ES512',
            privateKey: process.env.AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY!,
            publicKey: process.env.AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY!,
            expirationTimeInSeconds:
                ms(
                    process.env
                        .AUTH_JWT_REFRESH_TOKEN_EXPIRED! as ms.StringValue
                ) / 1000,
        },

        audience: process.env.AUTH_JWT_AUDIENCE!,
        issuer: process.env.AUTH_JWT_ISSUER!,
        header: 'Authorization',
        prefix: 'Bearer',
    },

    password: {
        attempt: true,
        maxAttempt: 5,
        saltLength: 12,
        expiredInMs: ms('182d'),
        expiredTemporaryInMs: ms('3d'),
        periodInDays: ms('90d') / ms('1d'),
    },

    apple: {
        header: 'Authorization',
        prefix: 'Bearer',
        clientId: process.env.AUTH_SOCIAL_APPLE_CLIENT_ID ?? null,
        signInClientId: process.env.AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID ?? null,
    },
    google: {
        header: 'Authorization',
        prefix: 'Bearer',
        clientId: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_ID ?? null,
        clientSecret: process.env.AUTH_SOCIAL_GOOGLE_CLIENT_SECRET ?? null,
    },
    xApiKey: {
        header: 'x-api-key',
        keyPattern: 'ApiKey:{key}',
    },
    twoFactor: {
        strategy: 'totp',
        algorithm: 'sha1',
        issuer: process.env.AUTH_TWO_FACTOR_ISSUER!,
        digits: 6,
        periodInSeconds: ms('30s') / 1000,
        window: 1,
        secretLength: 32,
        challengeTtlInMs: ms('5m'),
        challengeKeyPattern: 'TwoFactor:Challenge:{token}',
        lockKeyPattern: 'TwoFactor:Lock:{userId}',
        backupCodes: {
            count: 8,
            length: 10,
        },
        maxAttempt: 5,
        lockAttemptDurationInMs: ms('2m'),
        encryption: {
            key: process.env.AUTH_TWO_FACTOR_ENCRYPTION_KEY!,
        },
    },
}));
