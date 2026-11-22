import { AppEnvSchema } from '@app/dtos/app.env.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';
import AppConfig from '@configs/app.config';
import AuthConfig from '@configs/auth.config';
import AwsConfig from '@configs/aws.config';
import MessageConfig from '@configs/message.config';
import SentryConfig from '@configs/sentry.config';
import {
    expectEnvKeyAtPath,
    sortedRowKeys,
} from '@test/unit/helpers/test.unit.app-env.helper';

interface IEnvKeyRow {
    key: string;
    alternateValue: string;
    derivedPaths: string[];
}

const AppRows: IEnvKeyRow[] = [
    {
        key: 'APP_NAME',
        alternateValue: 'other-app',
        derivedPaths: ['doc.name', 'mfa.passkey.rpName'],
    },
    { key: 'APP_ENV', alternateValue: 'staging', derivedPaths: [] },
    {
        key: 'APP_ENCRYPTION_SECRET',
        alternateValue: `${'c'.repeat(32)}${'D'.repeat(30)}-_`,
        derivedPaths: [],
    },
    { key: 'APP_HTTP_HOST', alternateValue: '127.0.0.1', derivedPaths: [] },
    { key: 'APP_HTTP_PORT', alternateValue: '3001', derivedPaths: [] },
    {
        key: 'APP_HTTP_TRUSTED_PROXIES',
        alternateValue: 'loopback,uniquelocal',
        derivedPaths: [],
    },
];

const FrontendRows: IEnvKeyRow[] = [
    {
        key: 'FRONTEND_BASE_URL',
        alternateValue: 'https://other.example.com',
        derivedPaths: [],
    },
    { key: 'FRONTEND_NAME', alternateValue: 'other-front', derivedPaths: [] },
];

const LoggerRows: IEnvKeyRow[] = [
    { key: 'LOGGER_ENABLED', alternateValue: 'false', derivedPaths: [] },
    { key: 'LOGGER_LEVEL', alternateValue: 'error', derivedPaths: [] },
    { key: 'LOGGER_FILE_ENABLED', alternateValue: 'false', derivedPaths: [] },
    { key: 'LOGGER_PRETTY_ENABLED', alternateValue: 'false', derivedPaths: [] },
    {
        key: 'LOGGER_ACCESS_LOG_ENABLED',
        alternateValue: 'false',
        derivedPaths: [],
    },
];

const SentryRows: IEnvKeyRow[] = [
    {
        key: 'SENTRY_DSN',
        alternateValue: 'https://other@sentry.example.com/2',
        derivedPaths: [],
    },
    {
        key: 'SENTRY_TRACES_SAMPLE_RATE',
        alternateValue: '0.5',
        derivedPaths: [],
    },
    {
        key: 'SENTRY_PROFILES_SAMPLE_RATE',
        alternateValue: '0.5',
        derivedPaths: [],
    },
];

const DatabaseRows: IEnvKeyRow[] = [
    {
        key: 'DATABASE_URL',
        alternateValue: 'mongodb://localhost:27017/other',
        derivedPaths: [],
    },
    {
        key: 'DATABASE_DEBUG_ENABLED',
        alternateValue: 'false',
        derivedPaths: [],
    },
];

const RedisRows: IEnvKeyRow[] = [
    {
        key: 'REDIS_CACHE_URL',
        alternateValue: 'redis://localhost:6379/5',
        derivedPaths: [],
    },
    {
        key: 'REDIS_QUEUE_URL',
        alternateValue: 'redis://localhost:6379/6',
        derivedPaths: [],
    },
];

const RequestRows: IEnvKeyRow[] = [
    {
        key: 'REQUEST_CORS_ALLOWED_ORIGINS',
        alternateValue: 'https://a.example.com,https://b.example.com',
        derivedPaths: [],
    },
];

const AuthRows: IEnvKeyRow[] = [
    {
        key: 'AUTH_JWT_AUDIENCE',
        alternateValue: 'https://other.example.com',
        derivedPaths: [],
    },
    { key: 'AUTH_JWT_ISSUER', alternateValue: 'other', derivedPaths: [] },
    {
        key: 'AUTH_JWT_ACCESS_TOKEN_JWKS_URI',
        alternateValue: 'http://localhost:3012/.well-known',
        derivedPaths: [],
    },
    {
        key: 'AUTH_JWT_ACCESS_TOKEN_KID',
        alternateValue: 'other-access-kid',
        derivedPaths: [],
    },
    {
        key: 'AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY',
        alternateValue: 'other-access-private-key',
        derivedPaths: [],
    },
    {
        key: 'AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY',
        alternateValue: 'other-access-public-key',
        derivedPaths: [],
    },
    {
        key: 'AUTH_JWT_REFRESH_TOKEN_JWKS_URI',
        alternateValue: 'http://localhost:3012/.well-known',
        derivedPaths: [],
    },
    {
        key: 'AUTH_JWT_REFRESH_TOKEN_KID',
        alternateValue: 'other-refresh-kid',
        derivedPaths: [],
    },
    {
        key: 'AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY',
        alternateValue: 'other-refresh-private-key',
        derivedPaths: [],
    },
    {
        key: 'AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY',
        alternateValue: 'other-refresh-public-key',
        derivedPaths: [],
    },
    {
        key: 'AUTH_SOCIAL_GOOGLE_CLIENT_ID',
        alternateValue: 'other-google',
        derivedPaths: [],
    },
    {
        key: 'AUTH_SOCIAL_APPLE_CLIENT_IDS',
        alternateValue: 'other-apple',
        derivedPaths: [],
    },
];

const MfaRows: IEnvKeyRow[] = [
    { key: 'MFA_TOTP_ISSUER', alternateValue: 'other', derivedPaths: [] },
    {
        key: 'MFA_TOTP_ENCRYPTION_SECRET',
        alternateValue: `${'c'.repeat(32)}${'D'.repeat(30)}-_`,
        derivedPaths: [],
    },
    {
        key: 'MFA_PASSKEY_RP_ID',
        alternateValue: 'example.com',
        derivedPaths: [],
    },
    {
        key: 'MFA_PASSKEY_ORIGINS',
        alternateValue: 'http://localhost:3000,http://localhost:3001',
        derivedPaths: [],
    },
];

const EmailRows: IEnvKeyRow[] = [
    {
        key: 'EMAIL_NO_REPLY_ADDRESS',
        alternateValue: 'other-noreply@example.com',
        derivedPaths: [],
    },
    {
        key: 'EMAIL_SUPPORT_ADDRESS',
        alternateValue: 'other-support@example.com',
        derivedPaths: [],
    },
];

const AwsRows: IEnvKeyRow[] = [
    {
        key: 'AWS_S3_ACCESS_KEY_ID',
        alternateValue: 'other-s3-key',
        derivedPaths: [],
    },
    {
        key: 'AWS_S3_SECRET_ACCESS_KEY',
        alternateValue: 'other-s3-secret',
        derivedPaths: [],
    },
    {
        key: 'AWS_S3_IAM_PRINCIPAL_ARN',
        alternateValue: 'arn:aws:iam::123456789012:user/other',
        derivedPaths: [],
    },
    { key: 'AWS_S3_REGION', alternateValue: 'eu-west-1', derivedPaths: [] },
    {
        key: 'AWS_S3_ENDPOINT',
        alternateValue: '',
        derivedPaths: ['aws.s3.baseUrlPattern'],
    },
    {
        key: 'AWS_S3_PUBLIC_BUCKET',
        alternateValue: 'other-public-bucket',
        derivedPaths: ['aws.s3.public.arn'],
    },
    {
        key: 'AWS_S3_PUBLIC_CDN_URL',
        alternateValue: 'https://other-public.cdn.example.com',
        derivedPaths: [],
    },
    {
        key: 'AWS_S3_PRIVATE_BUCKET',
        alternateValue: 'other-private-bucket',
        derivedPaths: ['aws.s3.private.arn'],
    },
    {
        key: 'AWS_S3_PRIVATE_CDN_URL',
        alternateValue: 'https://other-private.cdn.example.com',
        derivedPaths: [],
    },
    {
        key: 'AWS_SES_ACCESS_KEY_ID',
        alternateValue: 'other-ses-key',
        derivedPaths: [],
    },
    {
        key: 'AWS_SES_SECRET_ACCESS_KEY',
        alternateValue: 'other-ses-secret',
        derivedPaths: [],
    },
    {
        key: 'AWS_SES_IDENTITY_ARN',
        alternateValue: 'arn:aws:ses:us-east-1:123456789012:identity/other.com',
        derivedPaths: [],
    },
    { key: 'AWS_SES_REGION', alternateValue: 'eu-west-1', derivedPaths: [] },
    {
        key: 'AWS_SES_ENDPOINT',
        alternateValue: 'http://localhost:4567',
        derivedPaths: [],
    },
];

const FirebaseRows: IEnvKeyRow[] = [
    {
        key: 'FIREBASE_PROJECT_ID',
        alternateValue: 'other-firebase-project',
        derivedPaths: [],
    },
    {
        key: 'FIREBASE_CLIENT_EMAIL',
        alternateValue: 'other-firebase@example.com',
        derivedPaths: [],
    },
    {
        key: 'FIREBASE_PRIVATE_KEY',
        alternateValue: 'other-firebase-private-key',
        derivedPaths: [],
    },
];

describe('config factories', () => {
    describe('app', () => {
        it('holds the timezone and URL versioning as config values', () => {
            const config = AppConfig();

            expect(config.timezone).toBe(EnumRequestTimezone.asiaJakarta);
            expect(config.urlVersioning).toEqual({
                enabled: true,
                prefix: 'v',
                defaultVersion: '1',
            });
        });
    });

    describe('auth', () => {
        it('splits the Apple client id list, trimmed and without blanks', () => {
            vi.stubEnv('AUTH_SOCIAL_APPLE_CLIENT_IDS', 'a, b');
            const config = AuthConfig();
            vi.stubEnv('AUTH_SOCIAL_APPLE_CLIENT_IDS', '');
            const blankConfig = AuthConfig();
            vi.unstubAllEnvs();

            expect(config.social.apple.clientIds).toEqual(['a', 'b']);
            expect(blankConfig.social.apple.clientIds).toEqual([]);
        });

        it('holds both token lifetimes as config values', () => {
            vi.stubEnv('AUTH_JWT_ACCESS_TOKEN_KID', 'kid');
            const config = AuthConfig();
            vi.unstubAllEnvs();

            expect(config.jwt.accessToken.expiresInSeconds).toBe(3600);
            expect(config.jwt.refreshToken.expiresInSeconds).toBe(2592000);
        });
    });

    describe('aws', () => {
        it('holds each CDN URL as given, with nothing prepended', () => {
            vi.stubEnv('AWS_S3_PUBLIC_CDN_URL', 'https://cdn.example.com');
            vi.stubEnv('AWS_S3_PRIVATE_CDN_URL', '');
            const config = AwsConfig();
            vi.unstubAllEnvs();

            expect(config.s3.public.cdnUrl).toBe('https://cdn.example.com');
            expect(config.s3.private.cdnUrl).toBeNull();
        });

        it('holds the list page size as a config value', () => {
            expect(AwsConfig().s3.listMaxKeys).toBe(100);
        });

        it('holds the SES client bounds as config literals', () => {
            const config = AwsConfig();

            expect(config.ses.maxAttempts).toBe(1);
            expect(config.ses.timeoutInMs).toBe(30000);
        });
    });

    describe('message', () => {
        it('holds the default language as a config value', () => {
            const config = MessageConfig();

            expect(config.defaultLanguage).toBe(EnumMessageLanguage.en);
            expect(config.availableLanguages).toEqual(
                Object.values(EnumMessageLanguage)
            );
        });
    });

    describe('sentry', () => {
        it('holds the three SDK limits as config values', () => {
            vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', '0.3');
            vi.stubEnv('SENTRY_PROFILES_SAMPLE_RATE', '0.3');
            const config = SentryConfig();
            vi.unstubAllEnvs();

            expect(config.maxBreadcrumbs).toBe(30);
            expect(config.normalizeDepth).toBe(3);
            expect(config.maxValueLength).toBe(1000);
        });
    });

    describe('every environment key', () => {
        const Rows: IEnvKeyRow[] = [
            ...AppRows,
            ...FrontendRows,
            ...LoggerRows,
            ...SentryRows,
            ...DatabaseRows,
            ...RedisRows,
            ...RequestRows,
            ...AuthRows,
            ...MfaRows,
            ...EmailRows,
            ...AwsRows,
            ...FirebaseRows,
        ];

        it('has one row for each key of AppEnvSchema and no other', () => {
            expect(sortedRowKeys(Rows)).toEqual(
                Object.keys(AppEnvSchema.shape).sort()
            );
        });

        it.each(Rows)('puts $key at its own config path', row => {
            expectEnvKeyAtPath(row.key, row.alternateValue, row.derivedPaths);
        });
    });
});
