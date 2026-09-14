import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { RequestRequestIdMiddleware } from '@common/request/middlewares/request.request-id.middleware';
import { RequestRequestLogMiddleware } from '@common/request/middlewares/request.request-log.middleware';
import { RequestHelmetMiddleware } from '@common/request/middlewares/request.helmet.middleware';
import { RequestBodyParserMiddleware } from '@common/request/middlewares/request.body-parser.middleware';
import { RequestCorsMiddleware } from '@common/request/middlewares/request.cors.middleware';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';
import { RequestResponseTimeMiddleware } from '@common/request/middlewares/request.response-time.middleware';
import { RequestCustomLanguageMiddleware } from '@common/request/middlewares/request.custom-language.middleware';
import { RequestWorkspaceMiddleware } from '@common/request/middlewares/request.workspace.middleware';
import { RequestCompressionMiddleware } from '@common/request/middlewares/request.compression.middleware';
import { RequestThrottlerStorageService } from '@common/request/services/request.throttler.service';
import { RequestThrottlerModule } from '@common/request/request.throttler.module';
import { RequestThrottlerGuard } from '@common/request/guards/request.throttler.guard';
import { RequestThrottleRouteGuard } from '@common/request/guards/request.throttle-route.guard';
import { SentryModule } from '@sentry/nestjs/setup';

/**
 * Registers the Redis-backed throttler guards and applies the security/perf/monitoring middleware chain to all routes.
 */
@Module({
    controllers: [],
    exports: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: RequestThrottlerGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RequestThrottleRouteGuard,
        },
    ],
    imports: [
        SentryModule.forRoot(),
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule, RequestThrottlerModule],
            inject: [ConfigService, RequestThrottlerStorageService],
            useFactory: (
                config: ConfigService,
                storage: RequestThrottlerStorageService
            ): ThrottlerModuleOptions => ({
                throttlers: [
                    {
                        name: 'default',
                        ttl: config.get<number>(
                            'request.throttle.default.ttlInMs'
                        )!,
                        limit: config.get<number>(
                            'request.throttle.default.limit'
                        )!,
                        blockDuration: config.get<number>(
                            'request.throttle.default.blockDurationInMs'
                        )!,
                    },
                ],
                storage,
            }),
        }),
    ],
})
export class RequestMiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                RequestRequestIdMiddleware,
                RequestRequestLogMiddleware,
                RequestHelmetMiddleware,
                RequestBodyParserMiddleware,
                RequestCorsMiddleware,
                RequestUrlVersionMiddleware,
                RequestResponseTimeMiddleware,
                RequestCustomLanguageMiddleware,
                RequestWorkspaceMiddleware,
                RequestCompressionMiddleware
            )
            .forRoutes('{*wildcard}');
    }
}
