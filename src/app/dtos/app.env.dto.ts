import { z } from 'zod';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { RequestEncryptionSecretSchema } from '@common/request/validations/request.encryption-secret.validation';
import {
    RequestOptionalEnvEmailSchema,
    RequestOptionalEnvSchema,
    RequestOptionalEnvSesIdentityArnSchema,
    RequestOptionalEnvStringSchema,
    RequestOptionalEnvUrlNoTrailingSlashSchema,
} from '@common/request/validations/request.optional-env.validation';

/**
 * Validated shape of all application environment variables.
 * @public
 */
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
        HOME_URL: z.string().min(1),

        HTTP_HOST: z.string().min(1),
        HTTP_PORT: z.coerce.number().int(),
        HTTP_TRUSTED_PROXY: z.string().optional(),

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
        AUTH_JWT_ACCESS_TOKEN_JWKS_URI: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_KID: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: z.string().min(1),
        AUTH_JWT_ACCESS_TOKEN_EXPIRED: z
            .string()
            .min(1)
            .regex(/^\d+[smhd]$/),
        AUTH_JWT_REFRESH_TOKEN_JWKS_URI: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_KID: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: z.string().min(1),
        AUTH_JWT_REFRESH_TOKEN_EXPIRED: z
            .string()
            .min(1)
            .regex(/^\d+[smhd]$/),

        AUTH_TWO_FACTOR_ISSUER: z.string().min(1),
        AUTH_TWO_FACTOR_ENCRYPTION_KEY: RequestEncryptionSecretSchema,

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

        SENTRY_DSN: RequestOptionalEnvSchema(z.url()),

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
            env.AWS_S3_IAM_CREDENTIAL_KEY !== undefined ||
                env.AWS_S3_IAM_CREDENTIAL_SECRET !== undefined,
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
            env.AWS_SES_IAM_CREDENTIAL_KEY !== undefined ||
                env.AWS_SES_IAM_CREDENTIAL_SECRET !== undefined,
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
            env.FIREBASE_PROJECT_ID !== undefined ||
                env.FIREBASE_CLIENT_EMAIL !== undefined ||
                env.FIREBASE_PRIVATE_KEY !== undefined,
            [
                'FIREBASE_PROJECT_ID',
                'FIREBASE_CLIENT_EMAIL',
                'FIREBASE_PRIVATE_KEY',
            ],
            'a Firebase key is set'
        );
    });

/**
 * Validated application environment variables, inferred from `AppEnvSchema`.
 * @public
 */
export type AppEnvDto = z.infer<typeof AppEnvSchema>;
