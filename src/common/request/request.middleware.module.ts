import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import {
    ThrottlerGuard,
    ThrottlerModule,
    ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { AppHttpFilter } from '@app/filters/app.http.filter';
import { AppValidationImportFilter } from '@app/filters/app.validation-import.filter';
import { AppValidationFilter } from '@app/filters/app.validation.filter';
import { RequestRequestIdMiddleware } from '@common/request/middlewares/request.request-id.middleware';
import { RequestHelmetMiddleware } from '@common/request/middlewares/request.helmet.middleware';
import { RequestBodyParserMiddleware } from '@common/request/middlewares/request.body-parser.middleware';
import { RequestCorsMiddleware } from '@common/request/middlewares/request.cors.middleware';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';
import { RequestResponseTimeMiddleware } from '@common/request/middlewares/request.response-time.middleware';
import { RequestCustomLanguageMiddleware } from '@common/request/middlewares/request.custom-language.middleware';
import { RequestCompressionMiddleware } from '@common/request/middlewares/request.compression.middleware';
import { SentryModule } from '@sentry/nestjs/setup';

/**
 * Central middleware configuration module for HTTP request/response processing.
 * Configures security, performance optimization, monitoring, and error handling.
 */
@Module({
    controllers: [],
    exports: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        {
            provide: APP_FILTER,
            useClass: AppGeneralFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppHttpFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppValidationFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppValidationImportFilter,
        },
    ],
    imports: [
        SentryModule.forRoot(),
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
                throttlers: [
                    {
                        ttl: config.get<number>('request.throttle.ttlInMs'),
                        limit: config.get<number>('request.throttle.limit'),
                    },
                ],
            }),
        }),
    ],
})
export class RequestMiddlewareModule implements NestModule {
    /**
     * Configures the middleware processing pipeline for all HTTP requests.
     *
     * @param consumer - NestJS middleware consumer for applying middleware to routes
     */
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                RequestRequestIdMiddleware,
                RequestHelmetMiddleware,
                RequestBodyParserMiddleware,
                RequestCorsMiddleware,
                RequestUrlVersionMiddleware,
                RequestResponseTimeMiddleware,
                RequestCustomLanguageMiddleware,
                RequestCompressionMiddleware
            )
            .forRoutes('{*wildcard}');
    }
}
