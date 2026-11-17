import { z } from 'zod';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { RequestEncryptionSecretSchema } from '@common/request/validations/request.encryption-secret.validation';
import { RequestUrlNoTrailingSlashSchema } from '@common/request/validations/request.url-no-trailing-slash.validation';
import {
    RequestOptionalEnvEmailSchema,
    RequestOptionalEnvSesIdentityArnSchema,
    RequestOptionalEnvStringSchema,
    RequestOptionalEnvTrustedProxySchema,
    RequestOptionalEnvUrlNoTrailingSlashSchema,
    RequestOptionalEnvUrlSchema,
} from '@common/request/validations/request.optional-env.validation';

/** @public */
export const AppEnvSchema = z
    .object({
        APP_NAME: z.string().min(1),
        APP_ENV: z.enum(EnumAppEnvironment),
        APP_ENCRYPTION_SECRET: RequestEncryptionSecretSchema,

        EMAIL_NO_REPLY_ADDRESS: RequestOptionalEnvEmailSchema,
        EMAIL_SUPPORT_ADDRESS: RequestOptionalEnvEmailSchema,

        FRONTEND_NAME: z.string().min(1),
        FRONTEND_BASE_URL: RequestUrlNoTrailingSlashSchema,

        APP_HTTP_HOST: z.string().min(1),
        APP_HTTP_PORT: z.coerce.number().int(),
        APP_HTTP_TRUSTED_PROXIES: RequestOptionalEnvTrustedProxySchema,

        LOGGER_ENABLED: RequestBooleanStringSchema,
        LOGGER_LEVEL: z.enum(EnumLoggerLevel),
        LOGGER_FILE_ENABLED: RequestBooleanStringSchema,
        LOGGER_PRETTY_ENABLED: RequestBooleanStringSchema,
        LOGGER_ACCESS_LOG_ENABLED: RequestBooleanStringSchema,

        REQUEST_CORS_ALLOWED_ORIGINS: z.string().min(1),

        DATABASE_URL: z.string().min(1),
        DATABASE_DEBUG_ENABLED: RequestBooleanStringSchema,

        AUTH_JWT_AUDIENCE: z.string().min(1),
        AUTH_JWT_ISSUER: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_JWKS_URI: z.url(),
        AUTH_JWT_ACCESS_TOKEN_KID: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_JWKS_URI: z.url(),
        AUTH_JWT_REFRESH_TOKEN_KID: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: z.string().min(1),

        MFA_TOTP_ISSUER: z.string().min(1),
        MFA_TOTP_ENCRYPTION_SECRET: RequestEncryptionSecretSchema,
        MFA_PASSKEY_RP_ID: z.string().min(1),
        MFA_PASSKEY_ORIGINS: z.string().min(1),

        AUTH_SOCIAL_GOOGLE_CLIENT_ID: RequestOptionalEnvStringSchema,
        AUTH_SOCIAL_APPLE_CLIENT_IDS: RequestOptionalEnvStringSchema,

        AWS_S3_ACCESS_KEY_ID: RequestOptionalEnvStringSchema,
        AWS_S3_SECRET_ACCESS_KEY: RequestOptionalEnvStringSchema,
        AWS_S3_IAM_PRINCIPAL_ARN: RequestOptionalEnvStringSchema,
        AWS_S3_REGION: RequestOptionalEnvStringSchema,
        AWS_S3_ENDPOINT: RequestOptionalEnvUrlNoTrailingSlashSchema,
        AWS_S3_PUBLIC_BUCKET: RequestOptionalEnvStringSchema,
        AWS_S3_PUBLIC_CDN_URL: RequestOptionalEnvUrlNoTrailingSlashSchema,
        AWS_S3_PRIVATE_BUCKET: RequestOptionalEnvStringSchema,
        AWS_S3_PRIVATE_CDN_URL: RequestOptionalEnvUrlNoTrailingSlashSchema,

        AWS_SES_ACCESS_KEY_ID: RequestOptionalEnvStringSchema,
        AWS_SES_SECRET_ACCESS_KEY: RequestOptionalEnvStringSchema,
        AWS_SES_IDENTITY_ARN: RequestOptionalEnvSesIdentityArnSchema,
        AWS_SES_REGION: RequestOptionalEnvStringSchema,
        AWS_SES_ENDPOINT: RequestOptionalEnvUrlNoTrailingSlashSchema,

        REDIS_CACHE_URL: z.string().min(1),
        REDIS_QUEUE_URL: z.string().min(1),

        SENTRY_DSN: RequestOptionalEnvUrlSchema,
        SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1),
        SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1),

        FIREBASE_PROJECT_ID: RequestOptionalEnvStringSchema,
        FIREBASE_CLIENT_EMAIL: RequestOptionalEnvEmailSchema,
        FIREBASE_PRIVATE_KEY: RequestOptionalEnvStringSchema,
    })
    .superRefine((env, ctx) => {
        const requireAll = (
            triggered: boolean,
            keys: ReadonlyArray<keyof typeof env>,
            reason: string
        ): void => {
            if (!triggered) {
                return;
            }

            for (const key of keys) {
                if (!env[key]) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [key],
                        message: `${key} is required when ${reason}`,
                    });
                }
            }
        };

        requireAll(
            env.AWS_S3_ACCESS_KEY_ID !== null ||
                env.AWS_S3_SECRET_ACCESS_KEY !== null,
            [
                'AWS_S3_ACCESS_KEY_ID',
                'AWS_S3_SECRET_ACCESS_KEY',
                'AWS_S3_REGION',
                'AWS_S3_PUBLIC_BUCKET',
                'AWS_S3_PRIVATE_BUCKET',
            ],
            'an AWS S3 credential is set'
        );

        requireAll(
            env.AWS_SES_ACCESS_KEY_ID !== null ||
                env.AWS_SES_SECRET_ACCESS_KEY !== null,
            [
                'AWS_SES_ACCESS_KEY_ID',
                'AWS_SES_SECRET_ACCESS_KEY',
                'AWS_SES_REGION',
                'EMAIL_NO_REPLY_ADDRESS',
                'EMAIL_SUPPORT_ADDRESS',
            ],
            'an AWS SES credential is set'
        );

        requireAll(
            env.FIREBASE_PROJECT_ID !== null ||
                env.FIREBASE_CLIENT_EMAIL !== null ||
                env.FIREBASE_PRIVATE_KEY !== null,
            [
                'FIREBASE_PROJECT_ID',
                'FIREBASE_CLIENT_EMAIL',
                'FIREBASE_PRIVATE_KEY',
            ],
            'a Firebase key is set'
        );

        if (
            env.APP_ENV === EnumAppEnvironment.production &&
            env.REQUEST_CORS_ALLOWED_ORIGINS.split(',').some(
                origin => origin.trim() === '*'
            )
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['REQUEST_CORS_ALLOWED_ORIGINS'],
                message: 'Must list origins in production',
            });
        }

        const passkeyOrigins = env.MFA_PASSKEY_ORIGINS.split(',')
            .map(origin => origin.trim())
            .filter(origin => origin !== '');
        if (passkeyOrigins.length === 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['MFA_PASSKEY_ORIGINS'],
                message: 'Must list at least one origin',
            });
        }
        for (const origin of passkeyOrigins) {
            const wildcardPrefix = 'https://*.';
            const androidPrefix = 'android:apk-key-hash:';
            let isAllowed = false;
            if (origin === '*') {
                isAllowed = env.APP_ENV !== EnumAppEnvironment.production;
            } else if (origin.startsWith(androidPrefix)) {
                isAllowed = origin.length > androidPrefix.length;
            } else if (origin.startsWith(wildcardPrefix)) {
                const domain = origin.slice(wildcardPrefix.length);
                isAllowed =
                    domain === env.MFA_PASSKEY_RP_ID ||
                    domain.endsWith(`.${env.MFA_PASSKEY_RP_ID}`);
            } else if (!origin.includes('*') && URL.canParse(origin)) {
                const url = new URL(origin);
                isAllowed =
                    (url.protocol === 'https:' || url.protocol === 'http:') &&
                    url.origin === origin;
            }

            if (!isAllowed) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['MFA_PASSKEY_ORIGINS'],
                    message: `${origin} must be an exact origin, https://*.<domain> under MFA_PASSKEY_RP_ID, or android:apk-key-hash:<hash>`,
                });
            }
        }

        if (
            env.APP_ENV === EnumAppEnvironment.production &&
            env.DATABASE_DEBUG_ENABLED
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['DATABASE_DEBUG_ENABLED'],
                message: 'Must be false in production',
            });
        }
    });

/** @public */
export type AppEnvDto = z.infer<typeof AppEnvSchema>;
