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
import { AppBodyParserMiddleware } from '@app/middlewares/app.body-parser.middleware';
import { AppCorsMiddleware } from '@app/middlewares/app.cors.middleware';
import { AppCustomLanguageMiddleware } from '@app/middlewares/app.custom-language.middleware';
import { AppHelmetMiddleware } from '@app/middlewares/app.helmet.middleware';
import { AppResponseTimeMiddleware } from '@app/middlewares/app.response-time.middleware';
import { AppUrlVersionMiddleware } from '@app/middlewares/app.url-version.middleware';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppRequestIdMiddleware } from '@app/middlewares/app.request-id.middleware';
import { AppCompressionMiddleware } from '@app/middlewares/app.compression.middleware';

/**
 * Application middleware configuration module.
 *
 * This module is responsible for setting up all application-level middleware,
 * global guards, filters, and third-party integrations that process HTTP requests.
 * It provides a centralized configuration for request/response processing pipeline
 * and error handling across the entire application.
 *
 * @module AppMiddlewareModule
 *
 * Features:
 * - **Rate Limiting**: Configurable throttling with TTL and request limits to prevent abuse
 * - **Error Tracking**: Sentry integration for real-time error monitoring and debugging
 * - **Global Filters**: Comprehensive exception handling and validation error processing
 * - **Security Middleware**: Helmet for security headers, CORS for cross-origin requests
 * - **Request Processing**: Body parsing, response timing, compression, and unique ID generation
 * - **Performance Optimization**: Response compression for improved bandwidth usage
 *
 * Middleware Pipeline (applied in order):
 * 1. **Request ID generation** - Assigns unique identifier to each request for tracing
 * 2. **Security headers (Helmet)** - Sets various HTTP security headers
 * 3. **Body parsing** - Handles JSON, Text, Raw, and URL-encoded request bodies
 * 4. **CORS configuration** - Manages cross-origin resource sharing policies
 * 5. **URL versioning** - Handles API version routing based on URL patterns
 * 6. **Response time measurement** - Tracks and logs request processing duration
 * 7. **Custom language detection** - Processes Accept-Language headers for i18n
 * 8. **Response compression** - Compresses responses using gzip/deflate for performance
 *
 * Global Guards:
 * - **ThrottlerGuard** - Rate limiting based on configurable TTL and request limits
 *
 * Global Filters (processing order):
 * - **AppGeneralFilter** - Handles general application exceptions
 * - **AppValidationFilter** - Processes validation errors with detailed messages
 * - **AppValidationImportFilter** - Handles validation errors from imported data
 * - **AppHttpFilter** - Manages HTTP-specific errors and status codes
 *
 * @see {@link AppRequestIdMiddleware} Request ID generation and tracing
 * @see {@link AppHelmetMiddleware} Security headers configuration
 * @see {@link AppCorsMiddleware} Cross-origin resource sharing setup
 * @see {@link AppCompressionMiddleware} Response compression middleware
 * @see {@link ThrottlerGuard} Rate limiting and abuse prevention
 * @see {@link SentryModule} Error tracking and monitoring integration
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
                AppBodyParserMiddleware,
                AppCorsMiddleware,
                AppUrlVersionMiddleware,
                AppResponseTimeMiddleware,
                AppCustomLanguageMiddleware,
                AppCompressionMiddleware
            )
            .forRoutes('{*wildcard}');
    }
}
