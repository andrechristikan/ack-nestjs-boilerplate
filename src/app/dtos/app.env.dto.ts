import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsIP,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Min,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

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
    @IsEnum(EnumAppEnvironment)
    APP_ENV: EnumAppEnvironment;

    /**
     * The default language for the application
     */
    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumMessageLanguage)
    APP_LANGUAGE: EnumMessageLanguage;

    /**
     * The default timezone for the application
     */
    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumRequestTimezone)
    APP_TIMEZONE: EnumRequestTimezone;

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
    @IsString()
    @MinLength(1)
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
    @IsEnum(EnumLoggerLevel)
    LOGGER_LEVEL: EnumLoggerLevel;

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
     * The allowed origin(s) for CORS
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    CORS_ALLOWED_ORIGIN: string;

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
     * JWKS URI for access token verification
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_JWKS_URI: string;

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
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: string;

    /**
     * Access token public key content
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: string;

    /**
     * Expiration time for access tokens (duration format: 15m, 1h, 1d)
     */
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @Matches(/^\d+[smhd]$/)
    AUTH_JWT_ACCESS_TOKEN_EXPIRED: string;

    /**
     * JWKS URI for refresh token verification
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_JWKS_URI: string;

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
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: string;

    /**
     * Refresh token public key content
     */
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: string;

    /**
     * Expiration time for refresh tokens (duration format: 15m, 1h, 1d)
     */
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d+[smhd]$/)
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_EXPIRED: string;

    /**
     * Two-factor authentication issuer (TOTP label)
     */
    @IsNotEmpty()
    @IsString()
    AUTH_TWO_FACTOR_ISSUER: string;

    /**
     * Two-factor encryption key
     */
    @IsNotEmpty()
    @IsString()
    AUTH_TWO_FACTOR_ENCRYPTION_KEY: string;

    /**
     * Google OAuth client ID for social authentication (optional)
     */
    @IsOptional()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_ID?: string;

    /**
     * Google OAuth client secret for social authentication (optional)
     */
    @IsOptional()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_SECRET?: string;

    /**
     * Apple OAuth client ID for social authentication (optional)
     */
    @IsOptional()
    @IsString()
    AUTH_SOCIAL_APPLE_CLIENT_ID?: string;

    /**
     * Apple Sign In client ID for social authentication (optional)
     */
    @IsOptional()
    @IsString()
    AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID?: string;

    /**
     * AWS S3 access key for authentication
     */
    @IsOptional()
    @IsString()
    AWS_S3_IAM_CREDENTIAL_KEY?: string;

    /**
     * AWS S3 secret key for authentication
     */
    @IsOptional()
    @IsString()
    AWS_S3_IAM_CREDENTIAL_SECRET?: string;

    /**
     * AWS S3 IAM Role ARN for authentication (optional)
     */
    @IsNotEmpty()
    @IsString()
    @ValidateIf(
        o => o.AWS_S3_IAM_CREDENTIAL_KEY || o.AWS_S3_IAM_CREDENTIAL_SECRET
    )
    AWS_S3_IAM_ARN?: string;

    /**
     * AWS S3 region where the buckets are located
     */
    @IsNotEmpty()
    @IsString()
    AWS_S3_REGION?: string;

    /**
     * Name of the public S3 bucket for file storage
     */
    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_BUCKET?: string;

    /**
     * CDN URL for the public S3 bucket (optional)
     */
    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_CDN?: string;

    /**
     * Name of the private S3 bucket for secure file storage
     */
    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_BUCKET?: string;

    /**
     * CDN URL for the private S3 bucket (optional)
     */
    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_CDN?: string;

    /**
     * AWS SES access key for email service authentication
     */
    @IsOptional()
    @IsString()
    AWS_SES_IAM_CREDENTIAL_KEY?: string;

    /**
     * AWS SES secret key for email service authentication
     */
    @IsOptional()
    @IsString()
    AWS_SES_IAM_CREDENTIAL_SECRET?: string;

    /**
     * AWS SES IAM Role ARN for email service authentication (optional)
     */
    @IsNotEmpty()
    @IsString()
    @ValidateIf(
        o => o.AWS_SES_IAM_CREDENTIAL_KEY || o.AWS_SES_IAM_CREDENTIAL_SECRET
    )
    AWS_SES_IAM_ARN?: string;

    /**
     * AWS SES region for email service
     */
    @IsOptional()
    @IsString()
    AWS_SES_REGION?: string;

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
    @IsOptional()
    @IsString()
    SENTRY_DSN?: string;
}
