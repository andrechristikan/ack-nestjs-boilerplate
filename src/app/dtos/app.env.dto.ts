import { z } from 'zod';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';
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
        APP_LANGUAGE: z.enum(EnumMessageLanguage),
        APP_ENCRYPTION_SECRET_KEY: RequestEncryptionSecretSchema,
        APP_TIMEZONE: z.enum(EnumRequestTimezone),

        EMAIL_NO_REPLY: RequestOptionalEnvEmailSchema,
        EMAIL_SUPPORT: RequestOptionalEnvEmailSchema,

        HOME_NAME: z.string().min(1),
        HOME_URL: RequestUrlNoTrailingSlashSchema,

        HTTP_HOST: z.string().min(1),
        HTTP_PORT: z.coerce.number().int(),
        HTTP_TRUSTED_PROXY: RequestOptionalEnvTrustedProxySchema,

        LOGGER_ENABLE: RequestBooleanStringSchema,
        LOGGER_LEVEL: z.enum(EnumLoggerLevel),
        LOGGER_INTO_FILE: RequestBooleanStringSchema,
        LOGGER_PRETTIER: RequestBooleanStringSchema,
        LOGGER_AUTO: RequestBooleanStringSchema,

        CORS_ALLOWED_ORIGIN: z.string().min(1),

        URL_VERSIONING_ENABLE: RequestBooleanStringSchema,
        URL_VERSION: z.coerce.number().int().min(1),

        DATABASE_URL: z.string().min(1),
        DATABASE_DEBUG: RequestBooleanStringSchema,

        AUTH_JWT_AUDIENCE: z.string().min(1),
        AUTH_JWT_ISSUER: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_JWKS_URI: z.url(),
        AUTH_JWT_ACCESS_TOKEN_KID: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_EXPIRED: z.string().regex(/^\d+[smhd]$/),
        AUTH_JWT_REFRESH_TOKEN_JWKS_URI: z.url(),
        AUTH_JWT_REFRESH_TOKEN_KID: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_EXPIRED: z.string().regex(/^\d+[smhd]$/),

        MFA_TOTP_ISSUER: z.string().min(1),
        MFA_TOTP_ENCRYPTION_KEY: RequestEncryptionSecretSchema,
        MFA_PASSKEY_RP_ID: z.string().min(1),
        MFA_PASSKEY_ORIGINS: z.string().min(1),

        AUTH_SOCIAL_GOOGLE_CLIENT_ID: RequestOptionalEnvStringSchema,
        AUTH_SOCIAL_APPLE_CLIENT_ID: RequestOptionalEnvStringSchema,
        AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID: RequestOptionalEnvStringSchema,

        AWS_S3_IAM_CREDENTIAL_KEY: RequestOptionalEnvStringSchema,
        AWS_S3_IAM_CREDENTIAL_SECRET: RequestOptionalEnvStringSchema,
        AWS_S3_IAM_ARN: RequestOptionalEnvStringSchema,
        AWS_S3_REGION: RequestOptionalEnvStringSchema,
        AWS_S3_ENDPOINT: RequestOptionalEnvUrlNoTrailingSlashSchema,
        AWS_S3_PUBLIC_BUCKET: RequestOptionalEnvStringSchema,
        AWS_S3_PUBLIC_CDN: RequestOptionalEnvStringSchema,
        AWS_S3_PRIVATE_BUCKET: RequestOptionalEnvStringSchema,
        AWS_S3_PRIVATE_CDN: RequestOptionalEnvStringSchema,

        AWS_SES_IAM_CREDENTIAL_KEY: RequestOptionalEnvStringSchema,
        AWS_SES_IAM_CREDENTIAL_SECRET: RequestOptionalEnvStringSchema,
        AWS_SES_IDENTITY_ARN: RequestOptionalEnvSesIdentityArnSchema,
        AWS_SES_REGION: RequestOptionalEnvStringSchema,
        AWS_SES_ENDPOINT: RequestOptionalEnvUrlNoTrailingSlashSchema,

        CACHE_REDIS_URL: z.string().min(1),
        QUEUE_REDIS_URL: z.string().min(1),

        SENTRY_DSN: RequestOptionalEnvUrlSchema,

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
            env.AWS_S3_IAM_CREDENTIAL_KEY !== null ||
                env.AWS_S3_IAM_CREDENTIAL_SECRET !== null,
            [
                'AWS_S3_IAM_CREDENTIAL_KEY',
                'AWS_S3_IAM_CREDENTIAL_SECRET',
                'AWS_S3_REGION',
                'AWS_S3_PUBLIC_BUCKET',
                'AWS_S3_PRIVATE_BUCKET',
            ],
            'an AWS S3 credential is set'
        );

        requireAll(
            env.AWS_SES_IAM_CREDENTIAL_KEY !== null ||
                env.AWS_SES_IAM_CREDENTIAL_SECRET !== null,
            [
                'AWS_SES_IAM_CREDENTIAL_KEY',
                'AWS_SES_IAM_CREDENTIAL_SECRET',
                'AWS_SES_REGION',
                'EMAIL_NO_REPLY',
                'EMAIL_SUPPORT',
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
            env.CORS_ALLOWED_ORIGIN.split(',').some(
                origin => origin.trim() === '*'
            )
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['CORS_ALLOWED_ORIGIN'],
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
            env.DATABASE_DEBUG
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['DATABASE_DEBUG'],
                message: 'Must be false in production',
            });
        }
    });

/** @public */
export type AppEnvDto = z.infer<typeof AppEnvSchema>;
