import { AppEnvSchema } from '@app/dtos/app.env.dto';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';

describe('AppEnvSchema', () => {
    const encryptionSecret = `${'a'.repeat(32)}${'B'.repeat(30)}_-`;

    let validEnv: Record<string, string>;

    beforeEach(() => {
        validEnv = {
            APP_NAME: 'ack',
            APP_ENV: EnumAppEnvironment.local,
            APP_LANGUAGE: EnumMessageLanguage.en,
            APP_ENCRYPTION_SECRET_KEY: encryptionSecret,
            APP_TIMEZONE: EnumRequestTimezone.asiaJakarta,

            HOME_NAME: 'ack',
            HOME_URL: 'http://localhost:3000',

            HTTP_HOST: 'localhost',
            HTTP_PORT: '3000',

            LOGGER_ENABLE: 'true',
            LOGGER_LEVEL: EnumLoggerLevel.info,
            LOGGER_INTO_FILE: 'false',
            LOGGER_PRETTIER: 'false',
            LOGGER_AUTO: 'true',

            CORS_ALLOWED_ORIGIN: '*',

            URL_VERSIONING_ENABLE: 'true',
            URL_VERSION: '1',

            DATABASE_URL: 'mongodb://localhost:27017/ack',
            DATABASE_DEBUG: 'false',

            AUTH_JWT_AUDIENCE: 'https://example.com',
            AUTH_JWT_ISSUER: 'ack',
            AUTH_JWT_ACCESS_TOKEN_JWKS_URI: 'http://localhost:3011/.well-known',
            AUTH_JWT_ACCESS_TOKEN_KID: 'access-kid',
            AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: 'access-private-key',
            AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: 'access-public-key',
            AUTH_JWT_ACCESS_TOKEN_EXPIRED: '15m',
            AUTH_JWT_REFRESH_TOKEN_JWKS_URI:
                'http://localhost:3011/.well-known',
            AUTH_JWT_REFRESH_TOKEN_KID: 'refresh-kid',
            AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: 'refresh-private-key',
            AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: 'refresh-public-key',
            AUTH_JWT_REFRESH_TOKEN_EXPIRED: '7d',

            AUTH_TWO_FACTOR_ISSUER: 'ack',
            AUTH_TWO_FACTOR_ENCRYPTION_KEY: encryptionSecret,

            CACHE_REDIS_URL: 'redis://localhost:6379/0',
            QUEUE_REDIS_URL: 'redis://localhost:6379/1',
        };
    });

    describe('parsing a complete environment', () => {
        it('parses into exactly the declared required fields', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result).toEqual({
                APP_NAME: 'ack',
                APP_ENV: EnumAppEnvironment.local,
                APP_LANGUAGE: EnumMessageLanguage.en,
                APP_ENCRYPTION_SECRET_KEY: encryptionSecret,
                APP_TIMEZONE: EnumRequestTimezone.asiaJakarta,

                HOME_NAME: 'ack',
                HOME_URL: 'http://localhost:3000',

                HTTP_HOST: 'localhost',
                HTTP_PORT: 3000,

                LOGGER_ENABLE: true,
                LOGGER_LEVEL: EnumLoggerLevel.info,
                LOGGER_INTO_FILE: false,
                LOGGER_PRETTIER: false,
                LOGGER_AUTO: true,

                CORS_ALLOWED_ORIGIN: '*',

                URL_VERSIONING_ENABLE: true,
                URL_VERSION: 1,

                DATABASE_URL: 'mongodb://localhost:27017/ack',
                DATABASE_DEBUG: false,

                AUTH_JWT_AUDIENCE: 'https://example.com',
                AUTH_JWT_ISSUER: 'ack',
                AUTH_JWT_ACCESS_TOKEN_JWKS_URI:
                    'http://localhost:3011/.well-known',
                AUTH_JWT_ACCESS_TOKEN_KID: 'access-kid',
                AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: 'access-private-key',
                AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: 'access-public-key',
                AUTH_JWT_ACCESS_TOKEN_EXPIRED: '15m',
                AUTH_JWT_REFRESH_TOKEN_JWKS_URI:
                    'http://localhost:3011/.well-known',
                AUTH_JWT_REFRESH_TOKEN_KID: 'refresh-kid',
                AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: 'refresh-private-key',
                AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: 'refresh-public-key',
                AUTH_JWT_REFRESH_TOKEN_EXPIRED: '7d',

                AUTH_TWO_FACTOR_ISSUER: 'ack',
                AUTH_TWO_FACTOR_ENCRYPTION_KEY: encryptionSecret,

                CACHE_REDIS_URL: 'redis://localhost:6379/0',
                QUEUE_REDIS_URL: 'redis://localhost:6379/1',
            });
        });

        it('coerces the numeric variables to numbers', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result.HTTP_PORT).toBe(3000);
            expect(result.URL_VERSION).toBe(1);
        });

        it('coerces the boolean string variables to booleans', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result.LOGGER_ENABLE).toBe(true);
            expect(result.LOGGER_INTO_FILE).toBe(false);
            expect(result.DATABASE_DEBUG).toBe(false);
        });

        it('leaves the optional variables undefined when absent', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result.EMAIL_NO_REPLY).toBeUndefined();
            expect(result.HTTP_TRUSTED_PROXY).toBeUndefined();
            expect(result.SENTRY_DSN).toBeUndefined();
            expect(result.FIREBASE_PROJECT_ID).toBeUndefined();
        });

        it('strips an undeclared variable', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                NOT_DECLARED_HERE: 'value',
            });

            expect(result).not.toHaveProperty('NOT_DECLARED_HERE');
        });
    });

    describe('rejecting an invalid environment', () => {
        it('rejects a missing required variable', () => {
            const withoutDatabaseUrl = { ...validEnv };
            delete withoutDatabaseUrl.DATABASE_URL;
            const result = AppEnvSchema.safeParse(withoutDatabaseUrl);

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['DATABASE_URL'] })
            );
        });

        it('rejects an empty APP_NAME', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_NAME: '',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['APP_NAME'] })
            );
        });

        it('rejects an APP_ENV outside EnumAppEnvironment', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: 'sandbox',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['APP_ENV'] })
            );
        });

        it('rejects an APP_LANGUAGE outside EnumMessageLanguage', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_LANGUAGE: 'id',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['APP_LANGUAGE'] })
            );
        });

        it('rejects an APP_TIMEZONE outside EnumRequestTimezone', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_TIMEZONE: 'Europe/Berlin',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['APP_TIMEZONE'] })
            );
        });

        it('rejects an encryption secret that is not 64 base64url characters', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENCRYPTION_SECRET_KEY: 'a'.repeat(63),
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['APP_ENCRYPTION_SECRET_KEY'] })
            );
        });

        it('rejects a two-factor encryption key with a character outside base64url', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AUTH_TWO_FACTOR_ENCRYPTION_KEY: `${'a'.repeat(63)}+`,
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    path: ['AUTH_TWO_FACTOR_ENCRYPTION_KEY'],
                })
            );
        });

        it('rejects a boolean string that is not exactly true or false', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                LOGGER_ENABLE: 'TRUE',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['LOGGER_ENABLE'] })
            );
        });

        it('rejects a LOGGER_LEVEL outside EnumLoggerLevel', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                LOGGER_LEVEL: 'verbose',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['LOGGER_LEVEL'] })
            );
        });

        it('rejects a URL_VERSION below one', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                URL_VERSION: '0',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['URL_VERSION'] })
            );
        });

        it('rejects an HTTP_PORT that is not an integer', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                HTTP_PORT: '3000.5',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['HTTP_PORT'] })
            );
        });

        it('rejects a token expiry that is not a duration', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AUTH_JWT_ACCESS_TOKEN_EXPIRED: '15 minutes',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    path: ['AUTH_JWT_ACCESS_TOKEN_EXPIRED'],
                })
            );
        });

        it('rejects a refresh token expiry that is not a duration', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AUTH_JWT_REFRESH_TOKEN_EXPIRED: 'forever',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    path: ['AUTH_JWT_REFRESH_TOKEN_EXPIRED'],
                })
            );
        });

        it('rejects an optional email that is not an email address', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                EMAIL_NO_REPLY: 'not-an-email',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['EMAIL_NO_REPLY'] })
            );
        });

        it('rejects an empty AWS_S3_IAM_ARN', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_IAM_ARN: '',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['AWS_S3_IAM_ARN'] })
            );
        });
    });

    describe('AWS credential refinement', () => {
        it('requires AWS_S3_IAM_ARN when the S3 credential key is set', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_IAM_CREDENTIAL_KEY: 's3-key',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    code: 'custom',
                    path: ['AWS_S3_IAM_ARN'],
                })
            );
        });

        it('requires AWS_S3_IAM_ARN when only the S3 credential secret is set', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_IAM_CREDENTIAL_SECRET: 's3-secret',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    code: 'custom',
                    path: ['AWS_S3_IAM_ARN'],
                })
            );
        });

        it('accepts an S3 credential accompanied by its ARN', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_IAM_CREDENTIAL_KEY: 's3-key',
                AWS_S3_IAM_CREDENTIAL_SECRET: 's3-secret',
                AWS_S3_IAM_ARN: 'arn:aws:iam::1:user/s3',
            });

            expect(result.success).toBe(true);
        });

        it('requires AWS_SES_IAM_ARN when the SES credential key is set', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_IAM_CREDENTIAL_KEY: 'ses-key',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    code: 'custom',
                    path: ['AWS_SES_IAM_ARN'],
                })
            );
        });

        it('requires AWS_SES_IAM_ARN when only the SES credential secret is set', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_IAM_CREDENTIAL_SECRET: 'ses-secret',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    code: 'custom',
                    path: ['AWS_SES_IAM_ARN'],
                })
            );
        });

        it('accepts a SES credential accompanied by its ARN', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_IAM_CREDENTIAL_KEY: 'ses-key',
                AWS_SES_IAM_CREDENTIAL_SECRET: 'ses-secret',
                AWS_SES_IAM_ARN: 'arn:aws:iam::1:user/ses',
            });

            expect(result.success).toBe(true);
        });

        it('raises no credential issue when neither AWS credential is set', () => {
            const result = AppEnvSchema.safeParse(validEnv);

            expect(result.success).toBe(true);
        });
    });
});
