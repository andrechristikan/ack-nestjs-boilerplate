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
 *
 * Configures the complete middleware stack including security, performance optimization,
 * monitoring, and error handling for all HTTP requests in the application.
 *
 * @module RequestMiddlewareModule
 *
 * ## Features
 * - **Security**: Rate limiting, security headers (Helmet), CORS configuration
 * - **Performance**: Response compression, body parsing, response time tracking
 * - **Monitoring**: Request tracing (UUID), error tracking (Sentry), analytics
 * - **Application**: API versioning, internationalization, content negotiation
 *
 * ## Middleware Pipeline
 * 1. Request ID → 2. Security Headers → 3. Body Parsing → 4. CORS
 * 5. URL Versioning → 6. Response Time → 7. Language Detection → 8. Compression
 *
 * ## Global Components
 * - **Guards**: ThrottlerGuard (rate limiting)
 * - **Filters**: General, Validation, ValidationImport, HTTP error handling
 * - **Integrations**: Sentry error tracking, Throttler rate limiting
 *
 * @see {@link RequestRequestIdMiddleware} Request identification
 * @see {@link RequestHelmetMiddleware} Security headers
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
                        ttl: config.get<number>(
                            'request.middleware.throttle.ttl'
                        ),
                        limit: config.get<number>(
                            'request.middleware.throttle.limit'
                        ),
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
     * Applies middleware in a specific sequence for proper request handling,
     * security enforcement, and performance optimization.
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
