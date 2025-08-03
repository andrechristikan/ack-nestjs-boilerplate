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
import {
    ENUM_APP_ENVIRONMENT,
    ENUM_APP_LANGUAGE,
    ENUM_APP_LOG_LEVEL,
    ENUM_APP_TIMEZONE,
} from '@app/enums/app.enum';

export class AppEnvDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    APP_NAME: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_ENVIRONMENT)
    APP_ENV: ENUM_APP_ENVIRONMENT;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_LANGUAGE)
    APP_LANGUAGE: ENUM_APP_LANGUAGE;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_TIMEZONE)
    APP_TIMEZONE: ENUM_APP_TIMEZONE;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    HOME_NAME: string;

    @IsNotEmpty()
    @IsUrl()
    @IsString()
    HOME_URL: string;

    @IsNotEmpty()
    @IsString()
    @IsIP('4')
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
    DEBUG_ENABLE: boolean;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ENUM_APP_LOG_LEVEL)
    DEBUG_LEVEL: string;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DEBUG_INTO_FILE: boolean;

    @IsBoolean()
    @IsNotEmpty()
    @Type(() => Boolean)
    DEBUG_PRETTIER: boolean;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    MIDDLEWARE_CORS_ORIGIN: string;

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
    @IsUrl()
    AUTH_JWT_JWKS_URI: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_ACCESS_TOKEN_KID: string;

    @IsString()
    @IsNotEmpty()
    @Matches(
        /^([a-zA-Z]:)?[\/\\]?([^<>:"|?*\r\n]+[\/\\])*[^<>:"|?*\r\n]*\.(pem|key|crt|pub)$/,
        {
            message:
                'Must be a valid file path with .pem, .key, .crt, or .pub extension',
        }
    )
    AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY_PATH: string;

    @IsString()
    @IsNotEmpty()
    @Matches(
        /^([a-zA-Z]:)?[\/\\]?([^<>:"|?*\r\n]+[\/\\])*[^<>:"|?*\r\n]*\.(pem|key|crt|pub)$/,
        {
            message:
                'Must be a valid file path with .pem, .key, .crt, or .pub extension',
        }
    )
    AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY_PATH: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @Matches(/^\d+[smhd]$/, {
        message: 'Must be a valid duration (e.g., 15m, 1h, 1d)',
    })
    AUTH_JWT_ACCESS_TOKEN_EXPIRED: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    AUTH_JWT_REFRESH_TOKEN_KID: string;

    @IsString()
    @IsNotEmpty()
    @Matches(
        /^([a-zA-Z]:)?[\/\\]?([^<>:"|?*\r\n]+[\/\\])*[^<>:"|?*\r\n]*\.(pem|key|crt|pub)$/,
        {
            message:
                'Must be a valid file path with .pem, .key, .crt, or .pub extension',
        }
    )
    AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY_PATH: string;

    @IsString()
    @IsNotEmpty()
    @Matches(
        /^([a-zA-Z]:)?[\/\\]?([^<>:"|?*\r\n]+[\/\\])*[^<>:"|?*\r\n]*\.(pem|key|crt|pub)$/,
        {
            message:
                'Must be a valid file path with .pem, .key, .crt, or .pub extension',
        }
    )
    AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY_PATH: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\d+[smhd]$/, {
        message: 'Must be a valid duration (e.g., 15m, 1h, 1d)',
    })
    AUTH_JWT_REFRESH_TOKEN_EXPIRED: string;

    @IsNotEmpty()
    @IsString()
    AWS_S3_CREDENTIAL_KEY: string;

    @IsNotEmpty()
    @IsString()
    AWS_S3_CREDENTIAL_SECRET: string;

    @IsNotEmpty()
    @IsString()
    AWS_S3_REGION: string;

    @IsNotEmpty()
    @IsString()
    AWS_S3_PUBLIC_BUCKET: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    AWS_S3_PUBLIC_CDN?: string;

    @IsNotEmpty()
    @IsString()
    AWS_S3_PRIVATE_BUCKET: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    AWS_S3_PRIVATE_CDN?: string;

    @IsNotEmpty()
    @IsString()
    AWS_SES_CREDENTIAL_KEY: string;

    @IsNotEmpty()
    @IsString()
    AWS_SES_CREDENTIAL_SECRET: string;

    @IsNotEmpty()
    @IsString()
    AWS_SES_REGION: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_ID?: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_GOOGLE_CLIENT_SECRET?: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_APPLE_CLIENT_ID?: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID?: string;

    @IsNotEmpty()
    @IsString()
    REDIS_HOST: string;

    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    REDIS_PORT: number;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    REDIS_USERNAME?: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    REDIS_PASSWORD?: string;

    @ValidateIf(
        o =>
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== undefined &&
            o.AUTH_SOCIAL_GOOGLE_CLIENT_ID !== ''
    )
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    SENTRY_DSN?: string;
}
