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
import {
    AppJsonBodyParserMiddleware,
    AppRawBodyParserMiddleware,
    AppTextBodyParserMiddleware,
    AppUrlencodedBodyParserMiddleware,
} from '@app/middlewares/app.body-parser.middleware';
import { AppCorsMiddleware } from '@app/middlewares/app.cors.middleware';
import { AppCustomLanguageMiddleware } from '@app/middlewares/app.custom-language.middleware';
import { AppHelmetMiddleware } from '@app/middlewares/app.helmet.middleware';
import { AppResponseTimeMiddleware } from '@app/middlewares/app.response-time.middleware';
import { AppUrlVersionMiddleware } from '@app/middlewares/app.url-version.middleware';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppRequestIdMiddleware } from '@app/middlewares/app.request-id.middleware';

/**
 * Application middleware configuration module.
 *
 * This module is responsible for setting up all application-level middleware,
 * global guards, filters, and third-party integrations that process HTTP requests.
 *
 * @module AppMiddlewareModule
 *
 * Features:
 * - **Rate Limiting**: Configurable throttling to prevent abuse
 * - **Error Tracking**: Sentry integration for monitoring and debugging
 * - **Global Filters**: Exception handling and validation error processing
 * - **Security Middleware**: Helmet, CORS, and request sanitization
 * - **Request Processing**: Body parsing, response timing, and ID generation
 *
 * Middleware Pipeline (applied in order):
 * 1. Request ID generation
 * 2. Security headers (Helmet)
 * 3. Body parsing (JSON, Text, Raw, URL-encoded)
 * 4. CORS configuration
 * 5. URL versioning
 * 6. Response time measurement
 * 7. Custom language detection
 *
 * @see {@link AppRequestIdMiddleware} Request ID generation
 * @see {@link AppHelmetMiddleware} Security headers
 * @see {@link AppCorsMiddleware} CORS configuration
 * @see {@link ThrottlerGuard} Rate limiting
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
            useClass: AppValidationFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppValidationImportFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppHttpFilter,
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
                        ttl: config.get<number>('middleware.throttle.ttl'),
                        limit: config.get<number>('middleware.throttle.limit'),
                    },
                ],
            }),
        }),
    ],
})
export class AppMiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                AppRequestIdMiddleware,
                AppHelmetMiddleware,
                AppJsonBodyParserMiddleware,
                AppTextBodyParserMiddleware,
                AppRawBodyParserMiddleware,
                AppUrlencodedBodyParserMiddleware,
                AppCorsMiddleware,
                AppUrlVersionMiddleware,
                AppResponseTimeMiddleware,
                AppCustomLanguageMiddleware
            )
            .forRoutes('{*wildcard}');
    }
}
