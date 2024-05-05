import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseModule } from 'src/common/database/database.module';
import { DatabaseService } from 'src/common/database/services/database.service';
import { MessageModule } from 'src/common/message/message.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { RequestModule } from 'src/common/request/request.module';
import { PolicyModule } from 'src/common/policy/policy.module';
import { AuthModule } from 'src/common/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import configs from 'src/configs';
import {
    ENUM_APP_ENVIRONMENT,
    ENUM_APP_TIMEZONE,
} from 'src/app/constants/app.enum.constant';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';

@Module({
    controllers: [],
    providers: [],
    imports: [
        // Config
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
            expandVariables: true,
            validationSchema: Joi.object({
                APP_NAME: Joi.string().required(),
                APP_ENV: Joi.string()
                    .valid(...Object.values(ENUM_APP_ENVIRONMENT))
                    .default(ENUM_APP_ENVIRONMENT.DEVELOPMENT)
                    .required(),
                APP_LANGUAGE: Joi.string()
                    .valid(...Object.values(ENUM_MESSAGE_LANGUAGE))
                    .default(ENUM_MESSAGE_LANGUAGE.EN)
                    .required(),
                APP_TIMEZONE: Joi.string()
                    .valid(...Object.values(ENUM_APP_TIMEZONE))
                    .default(ENUM_APP_TIMEZONE.ASIA_SINGAPORE)
                    .required(),
                APP_DEBUG: Joi.boolean().default(true).required(),

                HTTP_ENABLE: Joi.boolean().default(true).required(),
                HTTP_HOST: [
                    Joi.string().ip({ version: 'ipv4' }).required(),
                    Joi.valid('localhost').required(),
                ],
                HTTP_PORT: Joi.number().default(3000).required(),

                URL_VERSIONING_ENABLE: Joi.boolean().default(true).required(),
                URL_VERSION: Joi.number().required(),

                JOB_ENABLE: Joi.boolean().default(false).required(),

                DATABASE_URI: Joi.string()
                    .default('mongodb://localhost:27017')
                    .required(),
                DATABASE_DEBUG: Joi.boolean().default(false).required(),

                AUTH_JWT_SUBJECT: Joi.string().required(),
                AUTH_JWT_AUDIENCE: Joi.string().required(),
                AUTH_JWT_ISSUER: Joi.string().required(),

                AUTH_JWT_ACCESS_TOKEN_EXPIRED: Joi.string()
                    .default('15m')
                    .required(),
                AUTH_JWT_ACCESS_TOKEN_SECRET_KEY: Joi.string()
                    .alphanum()
                    .min(5)
                    .max(50)
                    .required(),
                AUTH_JWT_REFRESH_TOKEN_EXPIRED: Joi.string()
                    .default('182d')
                    .required(),
                AUTH_JWT_REFRESH_TOKEN_SECRET_KEY: Joi.string()
                    .alphanum()
                    .min(5)
                    .max(50)
                    .required(),

                AWS_S3_CREDENTIAL_KEY: Joi.string().allow(null, '').optional(),
                AWS_S3_CREDENTIAL_SECRET: Joi.string()
                    .allow(null, '')
                    .optional(),
                AWS_S3_REGION: Joi.string().allow(null, '').optional(),
                AWS_S3_BUCKET: Joi.string().allow(null, '').optional(),
                AWS_SES_CREDENTIAL_KEY: Joi.string().allow(null, '').optional(),
                AWS_SES_CREDENTIAL_SECRET: Joi.string()
                    .allow(null, '')
                    .optional(),
                AWS_SES_REGION: Joi.string().allow(null, '').optional(),

                AUTH_SOCIAL_GOOGLE_CLIENT_ID: Joi.string()
                    .allow(null, '')
                    .optional(),
                AUTH_SOCIAL_GOOGLE_CLIENT_SECRET: Joi.string()
                    .allow(null, '')
                    .optional(),

                AUTH_SOCIAL_APPLE_CLIENT_ID: Joi.string()
                    .allow(null, '')
                    .optional(),
                AUTH_SOCIAL_APPLE_TEAM_ID: Joi.string()
                    .allow(null, '')
                    .optional(),
                AUTH_SOCIAL_APPLE_KEY_ID: Joi.string()
                    .allow(null, '')
                    .optional(),
                AUTH_SOCIAL_APPLE_CALLBACK_URL: Joi.string()
                    .allow(null, '')
                    .optional(),

                SENTRY_DSN: Joi.string().allow(null, '').optional(),
            }),
            validationOptions: {
                allowUnknown: true,
                abortEarly: true,
            },
        }),
        MongooseModule.forRootAsync({
            connectionName: DATABASE_CONNECTION_NAME,
            imports: [DatabaseModule],
            inject: [DatabaseService],
            useFactory: (databaseService: DatabaseService) =>
                databaseService.createOptions(),
        }),
        MessageModule.forRoot(),
        HelperModule.forRoot(),
        RequestModule.forRoot(),
        PolicyModule.forRoot(),
        AuthModule.forRoot(),
        ApiKeyModule.forRoot(),
    ],
})
export class CommonModule {}
