import { AppEnvSchema } from '@app/dtos/app.env.dto';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';
import {
    buildBlankEnv,
    isEveryEnvBlank,
    omitKey,
    readEnvExample,
} from '@test/unit/helpers/test.unit.app-env.helper';

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

    describe('required variables', () => {
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

    describe('invalid variables', () => {
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

        it('rejects EMAIL_NO_REPLY that is not an email address', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                EMAIL_NO_REPLY: 'not-an-email',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['EMAIL_NO_REPLY'] })
            );
        });

        it('rejects EMAIL_SUPPORT that is not an email address', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                EMAIL_SUPPORT: 'not-an-email',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['EMAIL_SUPPORT'] })
            );
        });

        it('rejects a SENTRY_DSN that is not a URL', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                SENTRY_DSN: 'not a url',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['SENTRY_DSN'] })
            );
        });

        it('accepts a SENTRY_DSN that is a URL', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                SENTRY_DSN: 'https://key@o0.ingest.sentry.io/1',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('optional third-party integrations', () => {
        const thirdPartyKeys = [
            'EMAIL_NO_REPLY',
            'EMAIL_SUPPORT',
            'AUTH_SOCIAL_GOOGLE_CLIENT_ID',
            'AUTH_SOCIAL_APPLE_CLIENT_ID',
            'AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID',
            'AWS_S3_IAM_CREDENTIAL_KEY',
            'AWS_S3_IAM_CREDENTIAL_SECRET',
            'AWS_S3_IAM_ARN',
            'AWS_S3_REGION',
            'AWS_S3_ENDPOINT',
            'AWS_S3_PUBLIC_BUCKET',
            'AWS_S3_PUBLIC_CDN',
            'AWS_S3_PRIVATE_BUCKET',
            'AWS_S3_PRIVATE_CDN',
            'AWS_SES_IAM_CREDENTIAL_KEY',
            'AWS_SES_IAM_CREDENTIAL_SECRET',
            'AWS_SES_IDENTITY_ARN',
            'AWS_SES_REGION',
            'AWS_SES_ENDPOINT',
            'SENTRY_DSN',
            'FIREBASE_PROJECT_ID',
            'FIREBASE_CLIENT_EMAIL',
            'FIREBASE_PRIVATE_KEY',
        ];

        it('parses every third-party key as empty to undefined', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                ...buildBlankEnv(thirdPartyKeys),
            });

            for (const key of thirdPartyKeys) {
                expect(result).toHaveProperty(key, undefined);
            }
        });

        it('parses the third-party lines of .env.example, all blank', () => {
            const exampleThirdParty = readEnvExample(thirdPartyKeys);

            expect(Object.keys(exampleThirdParty)).toEqual(thirdPartyKeys);
            expect(isEveryEnvBlank(exampleThirdParty)).toBe(true);
            expect(
                AppEnvSchema.safeParse({ ...validEnv, ...exampleThirdParty })
                    .success
            ).toBe(true);
        });

        it('strips the removed EMAIL_ADMIN and Google client secret', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                EMAIL_ADMIN: 'admin@mail.com',
                AUTH_SOCIAL_GOOGLE_CLIENT_SECRET: 'secret',
            });

            expect(result).not.toHaveProperty('EMAIL_ADMIN');
            expect(result).not.toHaveProperty(
                'AUTH_SOCIAL_GOOGLE_CLIENT_SECRET'
            );
        });
    });

    describe('AWS S3 refinement', () => {
        const s3Complete = {
            AWS_S3_IAM_CREDENTIAL_KEY: 's3-key',
            AWS_S3_IAM_CREDENTIAL_SECRET: 's3-secret',
            AWS_S3_REGION: 'ap-southeast-1',
            AWS_S3_PUBLIC_BUCKET: 'public',
            AWS_S3_PRIVATE_BUCKET: 'private',
        };
        const s3Required = Object.keys(s3Complete);

        it('accepts a complete S3 set without the ARN, endpoint, or CDNs', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                ...s3Complete,
            });

            expect(result.success).toBe(true);
        });

        it('accepts a complete S3 set carrying the ARN, endpoint, and CDNs', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                ...s3Complete,
                AWS_S3_IAM_ARN: 'arn:aws:iam::1:user/s3',
                AWS_S3_ENDPOINT: 'http://localhost:4566',
                AWS_S3_PUBLIC_CDN: 'cdn.example.com',
                AWS_S3_PRIVATE_CDN: 'private-cdn.example.com',
            });

            expect(result.success).toBe(true);
        });

        for (const trigger of [
            'AWS_S3_IAM_CREDENTIAL_KEY',
            'AWS_S3_IAM_CREDENTIAL_SECRET',
        ]) {
            it(`requires every other S3 field when only ${trigger} is set`, () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    [trigger]: 'value',
                });

                expect(result.success).toBe(false);
                for (const key of omitKey(s3Required, trigger)) {
                    expect(result.error?.issues).toContainEqual(
                        expect.objectContaining({
                            code: 'custom',
                            path: [key],
                        })
                    );
                }
            });
        }

        for (const field of s3Required) {
            it(`requires ${field} once S3 is triggered`, () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    ...s3Complete,
                    [field]: '',
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({ code: 'custom', path: [field] })
                );
            });
        }

        it('does not trigger on an empty key and secret', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_IAM_CREDENTIAL_KEY: '',
                AWS_S3_IAM_CREDENTIAL_SECRET: '',
            });

            expect(result.success).toBe(true);
        });

        it('does not trigger on bucket or region alone', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_REGION: 'ap-southeast-1',
                AWS_S3_PUBLIC_BUCKET: 'public',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('AWS SES refinement', () => {
        const sesComplete = {
            AWS_SES_IAM_CREDENTIAL_KEY: 'ses-key',
            AWS_SES_IAM_CREDENTIAL_SECRET: 'ses-secret',
            AWS_SES_REGION: 'ap-southeast-1',
            EMAIL_NO_REPLY: 'noreply@mail.com',
            EMAIL_SUPPORT: 'support@mail.com',
        };
        const sesRequired = Object.keys(sesComplete);

        it('accepts a complete SES set without the ARN or endpoint', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                ...sesComplete,
            });

            expect(result.success).toBe(true);
        });

        it('accepts a complete SES set carrying the ARN and endpoint', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                ...sesComplete,
                AWS_SES_IDENTITY_ARN:
                    'arn:aws:ses:us-east-1:123456789012:identity/example.com',
                AWS_SES_ENDPOINT: 'http://localhost:4566',
            });

            expect(result.success).toBe(true);
        });

        for (const trigger of [
            'AWS_SES_IAM_CREDENTIAL_KEY',
            'AWS_SES_IAM_CREDENTIAL_SECRET',
        ]) {
            it(`requires every other SES field when only ${trigger} is set`, () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    [trigger]: 'value',
                });

                expect(result.success).toBe(false);
                for (const key of omitKey(sesRequired, trigger)) {
                    expect(result.error?.issues).toContainEqual(
                        expect.objectContaining({
                            code: 'custom',
                            path: [key],
                        })
                    );
                }
            });
        }

        for (const field of sesRequired) {
            it(`requires ${field} once SES is triggered`, () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    ...sesComplete,
                    [field]: '',
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({ code: 'custom', path: [field] })
                );
            });
        }

        it('accepts an SES identity ARN for an email address identity', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_IDENTITY_ARN:
                    'arn:aws:ses:eu-west-1:123456789012:identity/noreply@example.com',
            });

            expect(result.success).toBe(true);
        });

        for (const arn of [
            'arn:aws:iam::123456789012:user/ses',
            'arn:aws:ses:us-east-1:123456789012:configuration-set/default',
            'arn:aws:ses:us-east-1:1:identity/example.com',
            'arn:aws:ses:us-east-1:123456789012:identity/',
            'example.com',
        ]) {
            it(`rejects AWS_SES_IDENTITY_ARN ${arn}`, () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    AWS_SES_IDENTITY_ARN: arn,
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({
                        path: ['AWS_SES_IDENTITY_ARN'],
                    })
                );
            });
        }

        it('does not trigger on an empty key and secret', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_IAM_CREDENTIAL_KEY: '',
                AWS_SES_IAM_CREDENTIAL_SECRET: '',
            });

            expect(result.success).toBe(true);
        });

        it('does not trigger on the region or an address alone', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_REGION: 'ap-southeast-1',
                EMAIL_NO_REPLY: 'noreply@mail.com',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('Firebase refinement', () => {
        const firebaseComplete = {
            FIREBASE_PROJECT_ID: 'project',
            FIREBASE_CLIENT_EMAIL: 'firebase@project.iam.gserviceaccount.com',
            FIREBASE_PRIVATE_KEY: 'private-key',
        };
        const firebaseKeys = Object.keys(firebaseComplete);

        it('accepts all three keys together', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                ...firebaseComplete,
            });

            expect(result.success).toBe(true);
        });

        for (const trigger of firebaseKeys) {
            it(`requires the other two keys when only ${trigger} is set`, () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    [trigger]:
                        firebaseComplete[
                            trigger as keyof typeof firebaseComplete
                        ],
                });

                expect(result.success).toBe(false);
                for (const key of omitKey(firebaseKeys, trigger)) {
                    expect(result.error?.issues).toContainEqual(
                        expect.objectContaining({
                            code: 'custom',
                            path: [key],
                        })
                    );
                }
            });
        }

        it('rejects a FIREBASE_CLIENT_EMAIL that is not an email address', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                ...firebaseComplete,
                FIREBASE_CLIENT_EMAIL: 'not-an-email',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['FIREBASE_CLIENT_EMAIL'] })
            );
        });

        it('does not trigger on empty keys', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                FIREBASE_PROJECT_ID: '',
                FIREBASE_CLIENT_EMAIL: '',
                FIREBASE_PRIVATE_KEY: '',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('social sign-in', () => {
        it('accepts a Google client id alone', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AUTH_SOCIAL_GOOGLE_CLIENT_ID: 'google-client-id',
            });

            expect(result.success).toBe(true);
        });

        it('accepts an Apple client id alone', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AUTH_SOCIAL_APPLE_CLIENT_ID: 'apple-client-id',
            });

            expect(result.success).toBe(true);
        });

        it('accepts an Apple sign-in client id alone', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID: 'apple-sign-in-client-id',
            });

            expect(result.success).toBe(true);
        });

        it('parses the Google and Apple ids to undefined when empty', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                AUTH_SOCIAL_GOOGLE_CLIENT_ID: '',
                AUTH_SOCIAL_APPLE_CLIENT_ID: '',
                AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID: '',
            });

            expect(result.AUTH_SOCIAL_GOOGLE_CLIENT_ID).toBeUndefined();
            expect(result.AUTH_SOCIAL_APPLE_CLIENT_ID).toBeUndefined();
            expect(result.AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID).toBeUndefined();
        });
    });

    describe('AWS_S3_ENDPOINT', () => {
        it('parses a URL', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_ENDPOINT: 'http://localhost:4566',
            });

            expect(result.success).toBe(true);
        });

        it('rejects a value that is not a URL', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_ENDPOINT: 'not a url',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['AWS_S3_ENDPOINT'] })
            );
        });

        it('rejects a URL with a trailing slash', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_ENDPOINT: 'http://localhost:4566/',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['AWS_S3_ENDPOINT'] })
            );
        });

        it('parses when absent', () => {
            const result = AppEnvSchema.safeParse(validEnv);

            expect(result.success).toBe(true);
        });

        it('parses an empty value', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_S3_ENDPOINT: '',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('AWS_SES_ENDPOINT', () => {
        it('parses a URL', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_ENDPOINT: 'http://localhost:4566',
            });

            expect(result.success).toBe(true);
        });

        it('rejects a value that is not a URL', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_ENDPOINT: 'not a url',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['AWS_SES_ENDPOINT'] })
            );
        });

        it('rejects a URL with a trailing slash', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_ENDPOINT: 'http://localhost:4566/',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['AWS_SES_ENDPOINT'] })
            );
        });

        it('parses when absent', () => {
            const result = AppEnvSchema.safeParse(validEnv);

            expect(result.success).toBe(true);
        });

        it('parses an empty value', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_ENDPOINT: '',
            });

            expect(result.success).toBe(true);
        });
    });
});
