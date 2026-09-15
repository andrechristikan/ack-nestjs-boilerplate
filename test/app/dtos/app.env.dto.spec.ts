import { describe, expect, it } from 'vitest';

import { AppEnvSchema } from '@app/dtos/app.env.dto';

describe('AppEnvSchema', () => {
    const validEnv = {
        APP_NAME: 'ACK',
        APP_ENV: 'local',
        APP_LANGUAGE: 'en',
        APP_ENCRYPTION_SECRET_KEY: '12345678901234567890123456789012',
        APP_TIMEZONE: 'Asia/Jakarta',
        HOME_NAME: 'ACK',
        HOME_URL: 'https://example.com',
        HTTP_HOST: 'localhost',
        HTTP_PORT: '3000',
        LOGGER_ENABLE: 'true',
        LOGGER_LEVEL: 'debug',
        LOGGER_INTO_FILE: 'false',
        LOGGER_PRETTIER: 'true',
        LOGGER_AUTO: 'false',
        CORS_ALLOWED_ORIGIN: '*',
        URL_VERSIONING_ENABLE: 'true',
        URL_VERSION: '1',
        DATABASE_URL: 'postgresql://user:password@localhost:5432/ack',
        DATABASE_DEBUG: 'false',
        AUTH_JWT_AUDIENCE: 'ACK',
        AUTH_JWT_ISSUER: 'https://example.com',
        AUTH_JWT_ACCESS_TOKEN_JWKS_URI: 'https://example.com/access/jwks',
        AUTH_JWT_ACCESS_TOKEN_KID: 'access-key',
        AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: 'access-private-key',
        AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: 'access-public-key',
        AUTH_JWT_ACCESS_TOKEN_EXPIRED: '1h',
        AUTH_JWT_REFRESH_TOKEN_JWKS_URI: 'https://example.com/refreshInTx/jwks',
        AUTH_JWT_REFRESH_TOKEN_KID: 'refreshInTx-key',
        AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: 'refreshInTx-private-key',
        AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: 'refreshInTx-public-key',
        AUTH_JWT_REFRESH_TOKEN_EXPIRED: '30d',
        AUTH_TWO_FACTOR_ISSUER: 'ACK',
        AUTH_TWO_FACTOR_ENCRYPTION_KEY: 'two-factor-encryption-key',
        CACHE_REDIS_URL: 'redis://localhost:6379/0',
        QUEUE_REDIS_URL: 'redis://localhost:6379/1',
    } as const;

    it('coerces numeric and exact boolean environment values', () => {
        const result = AppEnvSchema.parse(validEnv);

        expect(result).toMatchObject({
            HTTP_PORT: 3000,
            URL_VERSION: 1,
            LOGGER_ENABLE: true,
            LOGGER_INTO_FILE: false,
            LOGGER_PRETTIER: true,
            LOGGER_AUTO: false,
            URL_VERSIONING_ENABLE: true,
            DATABASE_DEBUG: false,
        });
    });

    it('rejects boolean values with non-exact casing', () => {
        const result = AppEnvSchema.safeParse({
            ...validEnv,
            LOGGER_ENABLE: 'TRUE',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ path: ['LOGGER_ENABLE'] }),
                ])
            );
        }
    });

    it('accepts blank optional integration values without requiring them', () => {
        const result = AppEnvSchema.parse({
            ...validEnv,
            AWS_S3_IAM_ARN: '',
            AWS_SES_IAM_ARN: '',
        });

        expect(result.AWS_S3_IAM_ARN).toBe('');
        expect(result.AWS_SES_IAM_ARN).toBe('');
    });

    it.each([
        ['AWS_S3_IAM_CREDENTIAL_KEY', 'AWS_S3_IAM_ARN'],
        ['AWS_SES_IAM_CREDENTIAL_SECRET', 'AWS_SES_IAM_ARN'],
    ] as const)('requires %s to be paired with %s', (credentialKey, arnKey) => {
        const result = AppEnvSchema.safeParse({
            ...validEnv,
            [credentialKey]: 'credential',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ path: [arnKey] }),
                ])
            );
        }
    });
});
