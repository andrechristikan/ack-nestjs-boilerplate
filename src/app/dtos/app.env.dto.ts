import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumRequestTimezone } from '@common/request/enums/request.enum';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';

/**
 * Validated shape of all application environment variables.
 */
export class AppEnvDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    APP_NAME: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumAppEnvironment)
    APP_ENV: EnumAppEnvironment;

    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumMessageLanguage)
    APP_LANGUAGE: EnumMessageLanguage;

    @IsString()
    @IsNotEmpty()
    @MinLength(32)
    @MaxLength(64)
    APP_ENCRYPTION_SECRET_KEY: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumRequestTimezone)
    APP_TIMEZONE: EnumRequestTimezone;

    @IsString()
    @IsOptional()
    @IsEmail()
    EMAIL_NO_REPLY: string;

    @IsString()
    @IsOptional()
    @IsEmail()
    EMAIL_SUPPORT: string;

    @IsString()
    @IsOptional()
    @IsEmail()
    EMAIL_ADMIN: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    HOME_NAME: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    HOME_URL: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    HTTP_HOST: string;

    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    HTTP_PORT: number;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_ENABLE: boolean;

    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumLoggerLevel)
    LOGGER_LEVEL: EnumLoggerLevel;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_INTO_FILE: boolean;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_PRETTIER: boolean;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    LOGGER_AUTO: boolean;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    CORS_ALLOWED_ORIGIN: string;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    URL_VERSIONING_ENABLE: boolean;

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

    @IsNotEmpty()
    @IsString()
    DATABASE_URL: string;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DATABASE_DEBUG: boolean;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_AUDIENCE: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    AUTH_JWT_ISSUER: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_JWKS_URI: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_KID: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @Matches(/^\d+[smhd]$/)
    AUTH_JWT_ACCESS_TOKEN_EXPIRED: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_JWKS_URI: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_KID: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\d+[smhd]$/)
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_EXPIRED: string;

    @IsNotEmpty()
    @IsString()
    AUTH_TWO_FACTOR_ISSUER: string;

    @IsNotEmpty()
    @IsString()
    AUTH_TWO_FACTOR_ENCRYPTION_KEY: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_ID?: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_SECRET?: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_APPLE_CLIENT_ID?: string;

    @IsOptional()
    @IsString()
    AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID?: string;

    @IsOptional()
    @IsString()
    AWS_S3_IAM_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_S3_IAM_CREDENTIAL_SECRET?: string;

    @IsNotEmpty()
    @IsString()
    @ValidateIf(
        o => o.AWS_S3_IAM_CREDENTIAL_KEY || o.AWS_S3_IAM_CREDENTIAL_SECRET
    )
    AWS_S3_IAM_ARN?: string;

    @IsOptional()
    @IsString()
    AWS_S3_REGION?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_BUCKET?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PUBLIC_CDN?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_BUCKET?: string;

    @IsOptional()
    @IsString()
    AWS_S3_PRIVATE_CDN?: string;

    @IsOptional()
    @IsString()
    AWS_SES_IAM_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_SES_IAM_CREDENTIAL_SECRET?: string;

    @IsNotEmpty()
    @IsString()
    @ValidateIf(
        o => o.AWS_SES_IAM_CREDENTIAL_KEY || o.AWS_SES_IAM_CREDENTIAL_SECRET
    )
    AWS_SES_IAM_ARN?: string;

    @IsOptional()
    @IsString()
    AWS_SES_REGION?: string;

    @IsNotEmpty()
    @IsString()
    CACHE_REDIS_URL: string;

    @IsNotEmpty()
    @IsString()
    QUEUE_REDIS_URL: string;

    @IsOptional()
    @IsString()
    SENTRY_DSN?: string;

    @IsOptional()
    @IsString()
    FIREBASE_PROJECT_ID?: string;

    @IsOptional()
    @IsString()
    FIREBASE_CLIENT_EMAIL?: string;

    @IsOptional()
    @IsString()
    FIREBASE_PRIVATE_KEY?: string;
}
