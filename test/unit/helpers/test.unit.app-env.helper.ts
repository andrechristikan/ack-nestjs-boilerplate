import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { AppEnvSchema } from '@app/dtos/app.env.dto';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import ConfigFactories from '@configs/index';

const EncryptionSecretBase = `${'a'.repeat(32)}${'B'.repeat(30)}_-`;

export function buildBlankEnv(keys: string[]): Record<string, string> {
    return Object.fromEntries(keys.map(key => [key, '']));
}

export function readEnvExample(keys: string[]): Record<string, string> {
    const lines = readFileSync('.env.example', 'utf8').split('\n');
    const entries = lines
        .filter(line => line.includes('='))
        .map(line => {
            const index = line.indexOf('=');

            return [line.slice(0, index), line.slice(index + 1)];
        });
    const example = Object.fromEntries(entries);

    return Object.fromEntries(keys.map(key => [key, example[key]]));
}

export function readEnvExampleLines(): {
    keys: string[];
    isKeyValueOnly: boolean;
} {
    const lines = readFileSync('.env.example', 'utf8')
        .split('\n')
        .filter(line => line !== '');

    return {
        keys: lines.map(line => line.slice(0, line.indexOf('='))),
        isKeyValueOnly: lines.every(line => /^[A-Z0-9_]+=/.test(line)),
    };
}

export function isEveryEnvPlaceholder(env: Record<string, string>): boolean {
    return Object.values(env).every(value => /^<[A-Za-z0-9]+>$/.test(value));
}

export function omitKey(keys: string[], key: string): string[] {
    return keys.filter(candidate => candidate !== key);
}

function buildValidEnv(): Record<string, string> {
    return {
        APP_NAME: 'ack',
        APP_ENV: EnumAppEnvironment.local,
        APP_ENCRYPTION_SECRET: EncryptionSecretBase,

        EMAIL_NO_REPLY_ADDRESS: 'noreply@example.com',
        EMAIL_SUPPORT_ADDRESS: 'support@example.com',

        FRONTEND_NAME: 'ack',
        FRONTEND_BASE_URL: 'http://localhost:3000',

        APP_HTTP_HOST: 'localhost',
        APP_HTTP_PORT: '3000',
        APP_HTTP_TRUSTED_PROXIES: 'loopback',

        LOGGER_ENABLED: 'true',
        LOGGER_LEVEL: EnumLoggerLevel.info,
        LOGGER_FILE_ENABLED: 'true',
        LOGGER_PRETTY_ENABLED: 'true',
        LOGGER_ACCESS_LOG_ENABLED: 'true',

        REQUEST_CORS_ALLOWED_ORIGINS: 'http://localhost:3000',

        DATABASE_URL: 'mongodb://localhost:27017/ack',
        DATABASE_DEBUG_ENABLED: 'true',

        AUTH_JWT_AUDIENCE: 'https://example.com',
        AUTH_JWT_ISSUER: 'ack',
        AUTH_JWT_ACCESS_TOKEN_JWKS_URI: 'http://localhost:3011/.well-known',
        AUTH_JWT_ACCESS_TOKEN_KID: 'access-kid',
        AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: 'access-private-key',
        AUTH_JWT_REFRESH_TOKEN_JWKS_URI: 'http://localhost:3011/.well-known',
        AUTH_JWT_REFRESH_TOKEN_KID: 'refresh-kid',
        AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: 'refresh-private-key',

        MFA_TOTP_ISSUER: 'ack',
        MFA_TOTP_ENCRYPTION_SECRET: EncryptionSecretBase,
        MFA_PASSKEY_RP_ID: 'localhost',
        MFA_PASSKEY_ORIGINS: 'http://localhost:3000',

        AUTH_SOCIAL_GOOGLE_CLIENT_ID: 'google-client',
        AUTH_SOCIAL_APPLE_CLIENT_IDS: 'apple-client, apple-sign-in-client',

        AWS_S3_ACCESS_KEY_ID: 's3-key',
        AWS_S3_SECRET_ACCESS_KEY: 's3-secret',
        AWS_S3_IAM_PRINCIPAL_ARN: 'arn:aws:iam::123456789012:user/s3',
        AWS_S3_REGION: 'us-east-1',
        AWS_S3_ENDPOINT: 'http://localhost:4566',
        AWS_S3_PUBLIC_BUCKET: 'public-bucket',
        AWS_S3_PUBLIC_CDN_URL: 'https://public.cdn.example.com',
        AWS_S3_PRIVATE_BUCKET: 'private-bucket',
        AWS_S3_PRIVATE_CDN_URL: 'https://private.cdn.example.com',

        AWS_SES_ACCESS_KEY_ID: 'ses-key',
        AWS_SES_SECRET_ACCESS_KEY: 'ses-secret',
        AWS_SES_IDENTITY_ARN:
            'arn:aws:ses:us-east-1:123456789012:identity/example.com',
        AWS_SES_REGION: 'us-east-1',
        AWS_SES_ENDPOINT: 'http://localhost:4566',

        REDIS_CACHE_URL: 'redis://localhost:6379/0',
        REDIS_QUEUE_URL: 'redis://localhost:6379/1',

        SENTRY_DSN: 'https://key@sentry.example.com/1',
        SENTRY_TRACES_SAMPLE_RATE: '0.3',
        SENTRY_PROFILES_SAMPLE_RATE: '0.3',

        FIREBASE_PROJECT_ID: 'firebase-project',
        FIREBASE_CLIENT_EMAIL_ADDRESS: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: 'firebase-private-key',
    };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

function flattenConfig(
    value: Record<string, unknown>,
    prefix: string,
    leaves: Map<string, unknown>
): Map<string, unknown> {
    for (const [name, child] of Object.entries(value)) {
        const path = prefix === '' ? name : `${prefix}.${name}`;
        if (isPlainObject(child)) {
            flattenConfig(child, path, leaves);
        } else {
            leaves.set(path, child);
        }
    }

    return leaves;
}

function buildMergedConfig(
    variables: Record<string, string>
): Map<string, unknown> {
    for (const [key, value] of Object.entries(variables)) {
        vi.stubEnv(key, value);
    }

    const merged: Record<string, unknown> = {};
    for (const factory of ConfigFactories) {
        merged[String(factory.KEY).replace(/^CONFIGURATION\((.*)\)$/, '$1')] =
            factory();
    }
    vi.unstubAllEnvs();

    return flattenConfig(merged, '', new Map());
}

function pathToEnvKey(path: string): string {
    return path
        .replace(/\./g, '_')
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase();
}

export function expectEnvKeyAtPath(
    key: string,
    alternateValue: string,
    derivedPaths: string[]
): void {
    const base = buildValidEnv();
    const alternate = { ...base, [key]: alternateValue };
    AppEnvSchema.parse(base);
    AppEnvSchema.parse(alternate);

    const baseConfig = buildMergedConfig(base);
    const alternateConfig = buildMergedConfig(alternate);

    const changedPaths = [...baseConfig.keys()]
        .filter(
            path =>
                !isDeepStrictEqual(
                    baseConfig.get(path),
                    alternateConfig.get(path)
                )
        )
        .sort();
    const ownPaths = [...baseConfig.keys()].filter(
        path => pathToEnvKey(path) === key
    );

    expect(ownPaths).toHaveLength(1);
    expect(changedPaths).toEqual([...ownPaths, ...derivedPaths].sort());
}

export function sortedRowKeys(rows: { key: string }[]): string[] {
    return rows.map(row => row.key).sort();
}
