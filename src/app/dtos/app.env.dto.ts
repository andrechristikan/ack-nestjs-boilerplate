import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsIP,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsString,
    IsUrl,
    Matches,
    Min,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ENUM_REQUEST_TIMEZONE } from '@common/request/enums/request.enum';
import { ENUM_LOGGER_LEVEL } from '@common/logger/enums/logger.enum';

/**
 * Data Transfer Object for application environment configuration.
 *
 * Provides validation structure for all main environment variables required by the application.
 */
export class AppEnvDto {
    /**
     * The name of the application
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    APP_NAME: string;

    /**
     * The environment the application is running in
     */
    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_ENVIRONMENT)
    APP_ENV: ENUM_APP_ENVIRONMENT;

    /**
     * The default language for the application
     */
    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_MESSAGE_LANGUAGE)
    APP_LANGUAGE: ENUM_MESSAGE_LANGUAGE;

    /**
     * The default timezone for the application
     */
    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_REQUEST_TIMEZONE)
    APP_TIMEZONE: ENUM_REQUEST_TIMEZONE;

    /**
     * The name of the home/organization
     */
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    HOME_NAME: string;

    /**
     * The home/organization URL
     */
    @IsNotEmpty()
    @IsUrl()
    @IsString()
    HOME_URL: string;

    /**
     * The HTTP host/IP address for the server
     */
    @IsNotEmpty()
    @IsString()
    @IsIP('4')
    HTTP_HOST: string;

    /**
     * The HTTP port number for the server
     */
    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    HTTP_PORT: number;

    /**
     * Whether logging is enabled
     */
    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_ENABLE: boolean;

    /**
     * The logging level
     */
    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_LOGGER_LEVEL)
    LOGGER_LEVEL: string;

    /**
     * Whether to write logs to file
     */
    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_INTO_FILE: boolean;

    /**
     * Whether to format logs in a prettier way
     */
    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_PRETTIER: boolean;

    /**
     * Whether to enable automatic logging features
     */
    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_AUTO: boolean;

    /**
     * CORS origin configuration for the middleware
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    MIDDLEWARE_CORS_ORIGIN: string;

    /**
     * Whether URL versioning is enabled for the API
     */
    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    URL_VERSIONING_ENABLE: boolean;

    /**
     * The version number for URL versioning
     */
    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @Min(1)
    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    URL_VERSION: number;

    /**
     * Database connection URL/string
     */
    @IsNotEmpty()
    @IsString()
    DATABASE_URL: string;

    /**
     * Whether database debug mode is enabled
     */
    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DATABASE_DEBUG: boolean;

    /**
     * JWT audience claim for token validation
     */
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_AUDIENCE: string;

    /**
     * JWT issuer claim for token validation
     */
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_ISSUER: string;

    /**
     * JWKS URI endpoint for JWT key validation
     */
    @IsString()
    @IsNotEmpty()
    @IsUrl()
    AUTH_JWT_JWKS_URI: string;

    /**
     * Key ID for the access token in JWKS
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_KID: string;

    /**
     * Access token private key content
     */
    @IsString()
    @IsNotEmpty()
    AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: string;

    /**
     * Access token public key content
     */
    @IsString()
    @IsNotEmpty()
    AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: string;

    /**
     * Expiration time for access tokens (duration format: 15m, 1h, 1d)
     */
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @Matches(/^\d+[smhd]$/, {
        message: 'Must be a valid duration (e.g., 15m, 1h, 1d)',
    })
    AUTH_JWT_ACCESS_TOKEN_EXPIRED: string;

    /**
     * Key ID for the refresh token in JWKS
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_KID: string;

    /**
     * Refresh token private key content
     */
    @IsString()
    @IsNotEmpty()
    AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: string;

    /**
     * Refresh token public key content
     */
    @IsString()
    @IsNotEmpty()
    AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: string;

    /**
     * Expiration time for refresh tokens (duration format: 15m, 1h, 1d)
     */
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d+[smhd]$/, {
        message: 'Must be a valid duration (e.g., 15m, 1h, 1d)',
    })
    AUTH_JWT_REFRESH_TOKEN_EXPIRED: string;

    /**
     * AWS S3 access key for authentication
     */
    @IsNotEmpty()
    @IsString()
    AWS_S3_CREDENTIAL_KEY: string;

    /**
     * AWS S3 secret key for authentication
     */
    @IsNotEmpty()
    @IsString()
    AWS_S3_CREDENTIAL_SECRET: string;

    /**
     * AWS S3 region where the buckets are located
     */
    @IsNotEmpty()
    @IsString()
    AWS_S3_REGION: string;

    /**
     * Name of the public S3 bucket for file storage
     */
    @IsNotEmpty()
    @IsString()
    AWS_S3_PUBLIC_BUCKET: string;

    /**
     * CDN URL for the public S3 bucket (optional)
     */
    @ValidateIf(
        o => o.AWS_S3_PUBLIC_CDN !== undefined && o.AWS_S3_PUBLIC_CDN !== ''
    )
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    AWS_S3_PUBLIC_CDN?: string;

    /**
     * Name of the private S3 bucket for secure file storage
     */
    @IsNotEmpty()
    @IsString()
    AWS_S3_PRIVATE_BUCKET: string;

    /**
     * CDN URL for the private S3 bucket (optional)
     */
    @ValidateIf(
        o => o.AWS_S3_PRIVATE_CDN !== undefined && o.AWS_S3_PRIVATE_CDN !== ''
    )
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    AWS_S3_PRIVATE_CDN?: string;

    /**
     * AWS SES access key for email service authentication
     */
    @IsNotEmpty()
    @IsString()
    AWS_SES_CREDENTIAL_KEY: string;

    /**
     * AWS SES secret key for email service authentication
     */
    @IsNotEmpty()
    @IsString()
    AWS_SES_CREDENTIAL_SECRET: string;

    /**
     * AWS SES region for email service
     */
    @IsNotEmpty()
    @IsString()
    AWS_SES_REGION: string;

    /**
     * Google OAuth client ID for social authentication (optional)
     */
    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_ID?: string;

    /**
     * Google OAuth client secret for social authentication (optional)
     */
    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_SECRET !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_SECRET !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_SECRET?: string;

    /**
     * Apple OAuth client ID for social authentication (optional)
     */
    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_APPLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_APPLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_APPLE_CLIENT_ID?: string;

    /**
     * Apple Sign In client ID for social authentication (optional)
     */
    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID?: string;

    /**
     * Redis server URL for caching
     */
    @IsNotEmpty()
    @IsString()
    CACHE_REDIS_URL: string;

    /**
     * Queue Redis server hostname or IP address
     */
    @IsNotEmpty()
    @IsString()
    QUEUE_REDIS_URL: string;

    /**
     * Sentry DSN for error tracking and monitoring (optional)
     */
    @ValidateIf(o => o.SENTRY_DSN !== undefined && o.SENTRY_DSN !== '')
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    SENTRY_DSN?: string;
}
