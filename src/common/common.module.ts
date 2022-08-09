import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { DebuggerOptionsModule } from 'src/common/debugger/debugger.module';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.option.service';
import Configs from '../configs';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseOptionsModule } from 'src/common/database/database.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import { ErrorModule } from 'src/common/error/error.module';
import { ResponseModule } from 'src/common/response/response.module';
import { RequestModule } from 'src/common/request/request.module';
import { MiddlewareModule } from 'src/common/middleware/middleware.module';
import { AuthModule } from 'src/common/auth/auth.module';
import { MessageModule } from 'src/common/message/message.module';
import { LoggerModule } from 'src/common/logger/logger.module';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { SettingModule } from 'src/common/setting/setting.module';
import Joi from 'joi';
import { ENUM_MESSAGE_LANGUAGE } from './message/constants/message.enum.constant';

@Module({
    controllers: [],
    providers: [],
    imports: [
        ConfigModule.forRoot({
            load: Configs,
            ignoreEnvFile: false,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
            expandVariables: true,
            validationSchema: Joi.object({
                APP_NAME: Joi.string().required(),
                APP_ENV: Joi.string()
                    .valid('development', 'production')
                    .default('development')
                    .required(),
                APP_MODE: Joi.string()
                    .valid('simple', 'secure')
                    .default('simple')
                    .required(),
                APP_LANGUAGE: Joi.string()
                    .valid(...Object.values(ENUM_MESSAGE_LANGUAGE))
                    .default('en')
                    .required(),
                APP_TZ: Joi.any().default('Asia/Jakarta').required(),

                APP_HOST: [
                    Joi.string().ip({ version: 'ipv4' }).required(),
                    Joi.valid('localhost').required(),
                ],
                APP_PORT: Joi.number().default(3000).required(),
                APP_VERSIONING: Joi.boolean().default(true).required(),
                APP_DEBUG: Joi.boolean().default(true).required(),

                APP_HTTP_ON: Joi.boolean().default(true).required(),
                APP_JOB_ON: Joi.boolean().default(false).required(),

                DATABASE_HOST: Joi.any()
                    .default('mongodb://localhost:27017')
                    .required(),
                DATABASE_NAME: Joi.any().default('ack').required(),
                DATABASE_USER: Joi.any().optional(),
                DATABASE_PASSWORD: Joi.any().optional(),
                DATABASE_DEBUG: Joi.boolean().default(false).required(),
                DATABASE_OPTIONS: Joi.any().optional(),

                MIDDLEWARE_TOLERANCE_TIMESTAMP: Joi.string()
                    .default('5m')
                    .required(),
                MIDDLEWARE_TIMEOUT: Joi.string().default('30s').required(),

                AUTH_JWT_ACCESS_TOKEN_SECRET_KEY: Joi.string()
                    .alphanum()
                    .min(5)
                    .max(50)
                    .required(),
                AUTH_JWT_ACCESS_TOKEN_EXPIRED: Joi.string()
                    .default('30m')
                    .required(),
                AUTH_JWT_REFRESH_TOKEN_SECRET_KEY: Joi.string()
                    .alphanum()
                    .min(5)
                    .max(50)
                    .required(),
                AUTH_JWT_REFRESH_TOKEN_EXPIRED: Joi.string()
                    .default('7d')
                    .required(),
                AUTH_JWT_REFRESH_TOKEN_REMEMBER_ME_EXPIRED: Joi.string()
                    .default('30d')
                    .required(),

                AUTH_BASIC_TOKEN_CLIENT_ID: Joi.string().optional(),
                AUTH_BASIC_TOKEN_CLIENT_SECRET: Joi.string().optional(),

                AWS_CREDENTIAL_KEY: Joi.string().optional(),
                AWS_CREDENTIAL_SECRET: Joi.string().optional(),
                AWS_S3_REGION: Joi.string().optional(),
                AWS_S3_BUCKET: Joi.string().optional(),
            }),
            validationOptions: {
                allowUnknown: true,
                abortEarly: true,
            },
        }),
        WinstonModule.forRootAsync({
            inject: [DebuggerOptionService],
            imports: [DebuggerOptionsModule],
            useFactory: (debuggerOptionsService: DebuggerOptionService) =>
                debuggerOptionsService.createLogger(),
        }),
        MongooseModule.forRootAsync({
            connectionName: DATABASE_CONNECTION_NAME,
            inject: [DatabaseOptionsService],
            imports: [DatabaseOptionsModule],
            useFactory: (databaseOptionsService: DatabaseOptionsService) =>
                databaseOptionsService.createMongooseOptions(),
        }),
        MessageModule,
        HelperModule,
        PaginationModule,
        ErrorModule,
        LoggerModule,
        ResponseModule,
        RequestModule,
        MiddlewareModule,
        AuthModule,
        SettingModule,
    ],
})
export class CommonModule {}
