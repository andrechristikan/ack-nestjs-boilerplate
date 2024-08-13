import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
} from 'class-validator';
import {
    ENUM_APP_ENVIRONMENT,
    ENUM_APP_TIMEZONE,
} from 'src/app/enums/app.enum';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

export class AppEnvDto {
    @IsString()
    @IsNotEmpty()
    APP_NAME: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_ENVIRONMENT)
    APP_ENV: ENUM_APP_ENVIRONMENT;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_MESSAGE_LANGUAGE)
    APP_LANGUAGE: ENUM_MESSAGE_LANGUAGE;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_TIMEZONE)
    APP_TIMEZONE: ENUM_APP_TIMEZONE;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    APP_DEBUG: boolean;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    HTTP_ENABLE: boolean;

    @IsNotEmpty()
    @IsString()
    HTTP_HOST: string;

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    HTTP_PORT: number;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    URL_VERSIONING_ENABLE: boolean;

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    URL_VERSION: number;

    @IsNotEmpty()
    @IsString()
    DATABASE_URI: string;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DATABASE_DEBUG: boolean;

    @IsNotEmpty()
    @IsString()
    AUTH_JWT_AUDIENCE: string;

    @IsNotEmpty()
    @IsString()
    AUTH_JWT_ISSUER: string;

    @IsNotEmpty()
    @IsString()
    AUTH_JWT_ACCESS_TOKEN_EXPIRED: string;

    @IsNotEmpty()
    @IsString()
    AUTH_JWT_ACCESS_TOKEN_SECRET_KEY: string;

    @IsNotEmpty()
    @IsString()
    AUTH_JWT_REFRESH_TOKEN_EXPIRED: string;

    @IsNotEmpty()
    @IsString()
    AUTH_JWT_REFRESH_TOKEN_SECRET_KEY: string;

    @IsOptional()
    @IsString()
    AWS_S3_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_S3_CREDENTIAL_SECRET?: string;

    @IsOptional()
    @IsString()
    AWS_S3_REGION?: string;

    @IsOptional()
    @IsString()
    AWS_S3_BUCKET?: string;

    @IsOptional()
    @IsString()
    AWS_SES_CREDENTIAL_KEY?: string;

    @IsOptional()
    @IsString()
    AWS_SES_CREDENTIAL_SECRET?: string;

    @IsOptional()
    @IsString()
    AWS_SES_REGION?: string;

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

    @IsNotEmpty()
    @IsString()
    REDIS_HOST: string;

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    REDIS_PORT: number;

    @IsOptional()
    @IsString()
    REDIS_PASSWORD?: string;

    @IsNotEmpty()
    @IsBoolean()
    @Type(() => Boolean)
    REDIS_TLS: boolean;

    @IsOptional()
    @IsString()
    SENTRY_DSN?: string;

    @IsNotEmpty()
    @IsUrl()
    @IsString()
    CLIENT_URL: string;
}
