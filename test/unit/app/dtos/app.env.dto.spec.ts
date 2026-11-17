import { AppEnvSchema } from '@app/dtos/app.env.dto';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import {
    buildBlankEnv,
    isEveryEnvPlaceholder,
    omitKey,
    readEnvExample,
    readEnvExampleLines,
} from '@test/unit/helpers/test.unit.app-env.helper';

describe('AppEnvSchema', () => {
    const encryptionSecret = `${'a'.repeat(32)}${'B'.repeat(30)}_-`;

    let validEnv: Record<string, string>;

    beforeEach(() => {
        validEnv = {
            APP_NAME: 'ack',
            APP_ENV: EnumAppEnvironment.local,
            APP_ENCRYPTION_SECRET: encryptionSecret,

            FRONTEND_NAME: 'ack',
            FRONTEND_BASE_URL: 'http://localhost:3000',

            APP_HTTP_HOST: 'localhost',
            APP_HTTP_PORT: '3000',

            LOGGER_ENABLED: 'true',
            LOGGER_LEVEL: EnumLoggerLevel.info,
            LOGGER_FILE_ENABLED: 'false',
            LOGGER_PRETTY_ENABLED: 'false',
            LOGGER_ACCESS_LOG_ENABLED: 'true',

            REQUEST_CORS_ALLOWED_ORIGINS: '*',

            DATABASE_URL: 'mongodb://localhost:27017/ack',
            DATABASE_DEBUG_ENABLED: 'false',

            AUTH_JWT_AUDIENCE: 'https://example.com',
            AUTH_JWT_ISSUER: 'ack',
            AUTH_JWT_ACCESS_TOKEN_JWKS_URI: 'http://localhost:3011/.well-known',
            AUTH_JWT_ACCESS_TOKEN_KID: 'access-kid',
            AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: 'access-private-key',
            AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: 'access-public-key',
            AUTH_JWT_REFRESH_TOKEN_JWKS_URI:
                'http://localhost:3011/.well-known',
            AUTH_JWT_REFRESH_TOKEN_KID: 'refresh-kid',
            AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: 'refresh-private-key',
            AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: 'refresh-public-key',

            MFA_TOTP_ISSUER: 'ack',
            MFA_TOTP_ENCRYPTION_SECRET: encryptionSecret,
            MFA_PASSKEY_RP_ID: 'localhost',
            MFA_PASSKEY_ORIGINS: 'http://localhost:3000',

            REDIS_CACHE_URL: 'redis://localhost:6379/0',
            REDIS_QUEUE_URL: 'redis://localhost:6379/1',

            SENTRY_TRACES_SAMPLE_RATE: '0.3',
            SENTRY_PROFILES_SAMPLE_RATE: '0.3',
        };
    });

    describe('required variables', () => {
        it('parses into exactly the declared required fields', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result).toEqual({
                APP_NAME: 'ack',
                APP_ENV: EnumAppEnvironment.local,
                APP_ENCRYPTION_SECRET: encryptionSecret,

                FRONTEND_NAME: 'ack',
                FRONTEND_BASE_URL: 'http://localhost:3000',

                APP_HTTP_HOST: 'localhost',
                APP_HTTP_PORT: 3000,

                LOGGER_ENABLED: true,
                LOGGER_LEVEL: EnumLoggerLevel.info,
                LOGGER_FILE_ENABLED: false,
                LOGGER_PRETTY_ENABLED: false,
                LOGGER_ACCESS_LOG_ENABLED: true,

                REQUEST_CORS_ALLOWED_ORIGINS: '*',

                DATABASE_URL: 'mongodb://localhost:27017/ack',
                DATABASE_DEBUG_ENABLED: false,

                AUTH_JWT_AUDIENCE: 'https://example.com',
                AUTH_JWT_ISSUER: 'ack',
                AUTH_JWT_ACCESS_TOKEN_JWKS_URI:
                    'http://localhost:3011/.well-known',
                AUTH_JWT_ACCESS_TOKEN_KID: 'access-kid',
                AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: 'access-private-key',
                AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: 'access-public-key',
                AUTH_JWT_REFRESH_TOKEN_JWKS_URI:
                    'http://localhost:3011/.well-known',
                AUTH_JWT_REFRESH_TOKEN_KID: 'refresh-kid',
                AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: 'refresh-private-key',
                AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: 'refresh-public-key',

                MFA_TOTP_ISSUER: 'ack',
                MFA_TOTP_ENCRYPTION_SECRET: encryptionSecret,
                MFA_PASSKEY_RP_ID: 'localhost',
                MFA_PASSKEY_ORIGINS: 'http://localhost:3000',

                REDIS_CACHE_URL: 'redis://localhost:6379/0',
                REDIS_QUEUE_URL: 'redis://localhost:6379/1',
                SENTRY_TRACES_SAMPLE_RATE: 0.3,
                SENTRY_PROFILES_SAMPLE_RATE: 0.3,

                EMAIL_NO_REPLY_ADDRESS: null,
                EMAIL_SUPPORT_ADDRESS: null,
                APP_HTTP_TRUSTED_PROXIES: null,
                AUTH_SOCIAL_GOOGLE_CLIENT_ID: null,
                AUTH_SOCIAL_APPLE_CLIENT_IDS: null,
                AWS_S3_ACCESS_KEY_ID: null,
                AWS_S3_SECRET_ACCESS_KEY: null,
                AWS_S3_IAM_PRINCIPAL_ARN: null,
                AWS_S3_REGION: null,
                AWS_S3_ENDPOINT: null,
                AWS_S3_PUBLIC_BUCKET: null,
                AWS_S3_PUBLIC_CDN_URL: null,
                AWS_S3_PRIVATE_BUCKET: null,
                AWS_S3_PRIVATE_CDN_URL: null,
                AWS_SES_ACCESS_KEY_ID: null,
                AWS_SES_SECRET_ACCESS_KEY: null,
                AWS_SES_IDENTITY_ARN: null,
                AWS_SES_REGION: null,
                AWS_SES_ENDPOINT: null,
                SENTRY_DSN: null,
                FIREBASE_PROJECT_ID: null,
                FIREBASE_CLIENT_EMAIL: null,
                FIREBASE_PRIVATE_KEY: null,
            });
        });

        it('coerces the numeric variables to numbers', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result.APP_HTTP_PORT).toBe(3000);
        });

        it('coerces the boolean string variables to booleans', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result.LOGGER_ENABLED).toBe(true);
            expect(result.LOGGER_FILE_ENABLED).toBe(false);
            expect(result.DATABASE_DEBUG_ENABLED).toBe(false);
        });

        it('leaves the optional variables null when absent', () => {
            const result = AppEnvSchema.parse(validEnv);

            expect(result.EMAIL_NO_REPLY_ADDRESS).toBeNull();
            expect(result.APP_HTTP_TRUSTED_PROXIES).toBeNull();
            expect(result.SENTRY_DSN).toBeNull();
            expect(result.FIREBASE_PROJECT_ID).toBeNull();
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
        it.each([['true'], ['1'], ['loopbak'], ['10.0.0.0/33']])(
            'rejects APP_HTTP_TRUSTED_PROXIES %s',
            value => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    APP_HTTP_TRUSTED_PROXIES: value,
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({
                        path: ['APP_HTTP_TRUSTED_PROXIES'],
                    })
                );
            }
        );

        it('accepts a preset and CIDR list in APP_HTTP_TRUSTED_PROXIES', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                APP_HTTP_TRUSTED_PROXIES: 'loopback,10.0.0.0/8',
            });

            expect(result.APP_HTTP_TRUSTED_PROXIES).toBe('loopback,10.0.0.0/8');
        });

        it.each([['not a url'], ['http://localhost:3000/']])(
            'rejects FRONTEND_BASE_URL %s',
            value => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    FRONTEND_BASE_URL: value,
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({ path: ['FRONTEND_BASE_URL'] })
                );
            }
        );

        it.each([
            ['AUTH_JWT_ACCESS_TOKEN_JWKS_URI'],
            ['AUTH_JWT_REFRESH_TOKEN_JWKS_URI'],
        ])('rejects a %s that is not a URL', key => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                [key]: 'not a url',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: [key] })
            );
        });

        it('rejects a missing required variable', () => {
            const withoutDatabaseUrl = { ...validEnv };
            delete withoutDatabaseUrl.DATABASE_URL;
            const result = AppEnvSchema.safeParse(withoutDatabaseUrl);

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['DATABASE_URL'] })
            );
        });

        it.each([
            ['MFA_TOTP_ISSUER'],
            ['MFA_TOTP_ENCRYPTION_SECRET'],
            ['MFA_PASSKEY_RP_ID'],
            ['MFA_PASSKEY_ORIGINS'],
        ])('rejects a missing %s', key => {
            const withoutKey = { ...validEnv };
            delete withoutKey[key];
            const result = AppEnvSchema.safeParse(withoutKey);

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: [key] })
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

        it('rejects an encryption secret that is not 64 base64url characters', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENCRYPTION_SECRET: 'a'.repeat(63),
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['APP_ENCRYPTION_SECRET'] })
            );
        });

        it('rejects an MFA encryption key with a character outside base64url', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                MFA_TOTP_ENCRYPTION_SECRET: `${'a'.repeat(63)}+`,
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    path: ['MFA_TOTP_ENCRYPTION_SECRET'],
                })
            );
        });

        it('rejects a boolean string that is not exactly true or false', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                LOGGER_ENABLED: 'TRUE',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['LOGGER_ENABLED'] })
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

        it('rejects an APP_HTTP_PORT that is not an integer', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_HTTP_PORT: '3000.5',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['APP_HTTP_PORT'] })
            );
        });

        it('rejects EMAIL_NO_REPLY_ADDRESS that is not an email address', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                EMAIL_NO_REPLY_ADDRESS: 'not-an-email',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['EMAIL_NO_REPLY_ADDRESS'] })
            );
        });

        it('rejects EMAIL_SUPPORT_ADDRESS that is not an email address', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                EMAIL_SUPPORT_ADDRESS: 'not-an-email',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['EMAIL_SUPPORT_ADDRESS'] })
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

        it.each([
            ['SENTRY_TRACES_SAMPLE_RATE'],
            ['SENTRY_PROFILES_SAMPLE_RATE'],
        ])('rejects a %s above 1 or below 0', key => {
            for (const value of ['1.5', '-0.1']) {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    [key]: value,
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({ path: [key] })
                );
            }
        });

        it.each([
            ['SENTRY_TRACES_SAMPLE_RATE'],
            ['SENTRY_PROFILES_SAMPLE_RATE'],
        ])('accepts a %s of 0, 0.3, and 1, and parses blank as 0', key => {
            for (const [value, parsed] of [
                ['0', 0],
                ['0.3', 0.3],
                ['1', 1],
                ['', 0],
            ] as const) {
                const result = AppEnvSchema.parse({
                    ...validEnv,
                    [key]: value,
                });

                expect(result[key as keyof typeof result]).toBe(parsed);
            }
        });

        it.each([
            ['SENTRY_TRACES_SAMPLE_RATE'],
            ['SENTRY_PROFILES_SAMPLE_RATE'],
        ])('rejects a missing %s', key => {
            const withoutKey = { ...validEnv };
            delete withoutKey[key];
            const result = AppEnvSchema.safeParse(withoutKey);

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: [key] })
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
            'EMAIL_NO_REPLY_ADDRESS',
            'EMAIL_SUPPORT_ADDRESS',
            'APP_HTTP_TRUSTED_PROXIES',
            'AUTH_SOCIAL_GOOGLE_CLIENT_ID',
            'AUTH_SOCIAL_APPLE_CLIENT_IDS',
            'AWS_S3_ACCESS_KEY_ID',
            'AWS_S3_SECRET_ACCESS_KEY',
            'AWS_S3_IAM_PRINCIPAL_ARN',
            'AWS_S3_REGION',
            'AWS_S3_ENDPOINT',
            'AWS_S3_PUBLIC_BUCKET',
            'AWS_S3_PUBLIC_CDN_URL',
            'AWS_S3_PRIVATE_BUCKET',
            'AWS_S3_PRIVATE_CDN_URL',
            'AWS_SES_ACCESS_KEY_ID',
            'AWS_SES_SECRET_ACCESS_KEY',
            'AWS_SES_IDENTITY_ARN',
            'AWS_SES_REGION',
            'AWS_SES_ENDPOINT',
            'SENTRY_DSN',
            'FIREBASE_PROJECT_ID',
            'FIREBASE_CLIENT_EMAIL',
            'FIREBASE_PRIVATE_KEY',
        ];

        it('parses every third-party key as empty to null', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                ...buildBlankEnv(thirdPartyKeys),
            });

            for (const key of thirdPartyKeys) {
                expect(result).toHaveProperty(key, null);
            }
        });

        it('writes every third-party line of .env.example as a placeholder that parses empty to null', () => {
            const exampleThirdParty = readEnvExample(thirdPartyKeys);

            expect(Object.keys(exampleThirdParty)).toEqual(thirdPartyKeys);
            expect(isEveryEnvPlaceholder(exampleThirdParty)).toBe(true);

            const result = AppEnvSchema.parse({
                ...validEnv,
                ...buildBlankEnv(Object.keys(exampleThirdParty)),
            });
            for (const key of thirdPartyKeys) {
                expect(result).toHaveProperty(key, null);
            }
        });

        it('keeps .env.example on the same key set as the schema', () => {
            const example = readEnvExampleLines();

            expect(example.isKeyValueOnly).toBe(true);
            expect(example.keys.sort()).toEqual(
                Object.keys(AppEnvSchema.shape).sort()
            );
        });

        it('refuses the APP_ENCRYPTION_SECRET placeholder of .env.example', () => {
            const [example] = Object.values(
                readEnvExample(['APP_ENCRYPTION_SECRET'])
            );

            expect(example).toBe('<base64url64Characters>');
            expect(
                AppEnvSchema.safeParse({
                    ...validEnv,
                    APP_ENCRYPTION_SECRET: example,
                }).success
            ).toBe(false);
        });

        it('refuses the MFA_TOTP_ENCRYPTION_SECRET placeholder of .env.example', () => {
            const [example] = Object.values(
                readEnvExample(['MFA_TOTP_ENCRYPTION_SECRET'])
            );

            expect(example).toBe('<base64url64Characters>');
            expect(
                AppEnvSchema.safeParse({
                    ...validEnv,
                    MFA_TOTP_ENCRYPTION_SECRET: example,
                }).success
            ).toBe(false);
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
            AWS_S3_ACCESS_KEY_ID: 's3-key',
            AWS_S3_SECRET_ACCESS_KEY: 's3-secret',
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
                AWS_S3_IAM_PRINCIPAL_ARN: 'arn:aws:iam::1:user/s3',
                AWS_S3_ENDPOINT: 'http://localhost:4566',
                AWS_S3_PUBLIC_CDN_URL: 'https://cdn.example.com',
                AWS_S3_PRIVATE_CDN_URL: 'https://private-cdn.example.com',
            });

            expect(result.success).toBe(true);
        });

        for (const trigger of [
            'AWS_S3_ACCESS_KEY_ID',
            'AWS_S3_SECRET_ACCESS_KEY',
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
                AWS_S3_ACCESS_KEY_ID: '',
                AWS_S3_SECRET_ACCESS_KEY: '',
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
            AWS_SES_ACCESS_KEY_ID: 'ses-key',
            AWS_SES_SECRET_ACCESS_KEY: 'ses-secret',
            AWS_SES_REGION: 'ap-southeast-1',
            EMAIL_NO_REPLY_ADDRESS: 'noreply@mail.com',
            EMAIL_SUPPORT_ADDRESS: 'support@mail.com',
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
            'AWS_SES_ACCESS_KEY_ID',
            'AWS_SES_SECRET_ACCESS_KEY',
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
                AWS_SES_ACCESS_KEY_ID: '',
                AWS_SES_SECRET_ACCESS_KEY: '',
            });

            expect(result.success).toBe(true);
        });

        it('does not trigger on the region or an address alone', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AWS_SES_REGION: 'ap-southeast-1',
                EMAIL_NO_REPLY_ADDRESS: 'noreply@mail.com',
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

        it('accepts an Apple client id list', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                AUTH_SOCIAL_APPLE_CLIENT_IDS: 'apple-client-id, apple-sign-in',
            });

            expect(result.success).toBe(true);
        });

        it('parses the Google id and the Apple list to null when blank', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                AUTH_SOCIAL_GOOGLE_CLIENT_ID: '',
                AUTH_SOCIAL_APPLE_CLIENT_IDS: '',
            });

            expect(result.AUTH_SOCIAL_GOOGLE_CLIENT_ID).toBeNull();
            expect(result.AUTH_SOCIAL_APPLE_CLIENT_IDS).toBeNull();
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

    describe.each(['AWS_S3_PUBLIC_CDN_URL', 'AWS_S3_PRIVATE_CDN_URL'])(
        '%s',
        key => {
            it('parses a full URL', () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    [key]: 'https://cdn.example.com',
                });

                expect(result.success).toBe(true);
            });

            it('rejects a bare host', () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    [key]: 'cdn.example.com',
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({ path: [key] })
                );
            });

            it('rejects a URL with a trailing slash', () => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    [key]: 'https://cdn.example.com/',
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toContainEqual(
                    expect.objectContaining({ path: [key] })
                );
            });
        }
    );

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

    describe('database debug refinement', () => {
        it('rejects DATABASE_DEBUG_ENABLED true in production', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: EnumAppEnvironment.production,
                REQUEST_CORS_ALLOWED_ORIGINS: 'https://a.example.com',
                DATABASE_DEBUG_ENABLED: 'true',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toHaveLength(1);
            expect(result.error?.issues[0]).toMatchObject({
                path: ['DATABASE_DEBUG_ENABLED'],
                message: 'Must be false in production',
            });
        });

        it('parses DATABASE_DEBUG_ENABLED false in production', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: EnumAppEnvironment.production,
                REQUEST_CORS_ALLOWED_ORIGINS: 'https://a.example.com',
                DATABASE_DEBUG_ENABLED: 'false',
            });

            expect(result.success).toBe(true);
        });

        it('parses DATABASE_DEBUG_ENABLED true in local', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: EnumAppEnvironment.local,
                DATABASE_DEBUG_ENABLED: 'true',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('CORS origin refinement', () => {
        it('rejects a wildcard origin in production', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: EnumAppEnvironment.production,
                REQUEST_CORS_ALLOWED_ORIGINS: '*',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toHaveLength(1);
            expect(result.error?.issues[0]).toMatchObject({
                path: ['REQUEST_CORS_ALLOWED_ORIGINS'],
                message: 'Must list origins in production',
            });
        });

        it('rejects a wildcard among listed origins in production', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: EnumAppEnvironment.production,
                REQUEST_CORS_ALLOWED_ORIGINS: 'https://a.example.com, *',
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    path: ['REQUEST_CORS_ALLOWED_ORIGINS'],
                })
            );
        });

        it.each(['*.example.com', 'https://a.example.com'])(
            'parses %s in production',
            origin => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    APP_ENV: EnumAppEnvironment.production,
                    REQUEST_CORS_ALLOWED_ORIGINS: origin,
                });

                expect(result.success).toBe(true);
            }
        );

        it('parses a wildcard origin in local', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: EnumAppEnvironment.local,
                REQUEST_CORS_ALLOWED_ORIGINS: '*',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('MFA root secret', () => {
        it('rejects a missing MFA_TOTP_ENCRYPTION_SECRET when only the former MFA_ENCRYPTION_KEY is set', () => {
            const withFormerKey = { ...validEnv };
            delete withFormerKey.MFA_TOTP_ENCRYPTION_SECRET;
            const result = AppEnvSchema.safeParse({
                ...withFormerKey,
                MFA_ENCRYPTION_KEY: encryptionSecret,
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    path: ['MFA_TOTP_ENCRYPTION_SECRET'],
                })
            );
        });

        it('keeps no MFA_ENCRYPTION_KEY in the parsed env', () => {
            const result = AppEnvSchema.parse({
                ...validEnv,
                MFA_ENCRYPTION_KEY: encryptionSecret,
            });

            expect(result).not.toHaveProperty('MFA_ENCRYPTION_KEY');
        });
    });

    describe('MFA_PASSKEY_ORIGINS refinement', () => {
        const rpId = 'example.test';

        it('parses exact origins, a subdomain wildcard under the RP ID, an android key hash, and a local http origin', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                MFA_PASSKEY_RP_ID: rpId,
                MFA_PASSKEY_ORIGINS:
                    ' https://example.test, https://*.example.test,android:apk-key-hash:x,http://localhost:3000,, ',
            });

            expect(result.success).toBe(true);
        });

        it('parses a wildcard whose domain lies under the RP ID', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                MFA_PASSKEY_RP_ID: rpId,
                MFA_PASSKEY_ORIGINS: 'https://*.app.example.test',
            });

            expect(result.success).toBe(true);
        });

        it.each([
            ['a wildcard with no domain', 'https://*'],
            ['a trailing slash', 'https://example.test/'],
            ['a path', 'https://example.test/app'],
            ['a missing scheme', 'example.test'],
            ['an http wildcard', 'http://*.example.test'],
            ['a wildcard outside the RP ID', 'https://*.other.test'],
            [
                'a wildcard that only ends with the RP ID text',
                'https://*.notexample.test',
            ],
            ['an empty android key hash', 'android:apk-key-hash:'],
            ['an origin with a non-ASCII host', 'https://exämple.test'],
            ['only separators', ' , '],
        ])('rejects %s', (_label, origins) => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                MFA_PASSKEY_RP_ID: rpId,
                MFA_PASSKEY_ORIGINS: origins,
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({ path: ['MFA_PASSKEY_ORIGINS'] })
            );
        });

        it.each([
            [EnumAppEnvironment.local],
            [EnumAppEnvironment.development],
            [EnumAppEnvironment.staging],
        ])('parses a bare wildcard outside production in %s', appEnv => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: appEnv,
                MFA_PASSKEY_RP_ID: rpId,
                MFA_PASSKEY_ORIGINS: '*',
            });

            expect(result.success).toBe(true);
        });

        it('parses a bare wildcard among listed origins outside production', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                APP_ENV: EnumAppEnvironment.development,
                MFA_PASSKEY_RP_ID: rpId,
                MFA_PASSKEY_ORIGINS: '*,https://example.test',
            });

            expect(result.success).toBe(true);
        });

        it.each([['*'], ['*,https://example.test']])(
            'rejects the origins %s in production',
            origins => {
                const result = AppEnvSchema.safeParse({
                    ...validEnv,
                    APP_ENV: EnumAppEnvironment.production,
                    REQUEST_CORS_ALLOWED_ORIGINS: 'https://a.example.com',
                    MFA_PASSKEY_RP_ID: rpId,
                    MFA_PASSKEY_ORIGINS: origins,
                });

                expect(result.success).toBe(false);
                expect(result.error?.issues).toHaveLength(1);
                expect(result.error?.issues[0]).toMatchObject({
                    path: ['MFA_PASSKEY_ORIGINS'],
                    message: expect.stringContaining('*'),
                });
            }
        );

        it('names the refused entry in the message', () => {
            const result = AppEnvSchema.safeParse({
                ...validEnv,
                MFA_PASSKEY_RP_ID: rpId,
                MFA_PASSKEY_ORIGINS: 'https://example.test,https://*',
            });

            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    path: ['MFA_PASSKEY_ORIGINS'],
                    message: expect.stringContaining('https://*'),
                })
            );
        });
    });
});
