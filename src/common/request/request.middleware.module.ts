import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
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
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';
import { RequestThrottleModule } from '@common/request/request.throttle.module';
import { RequestThrottleDefaultGuard } from '@common/request/guards/request.throttle-default.guard';
import { RequestThrottleRouteGuard } from '@common/request/guards/request.throttle-route.guard';

/**
 * Registers the Redis-backed throttler guards and applies the security/perf/monitoring middleware chain to all routes.
 */
@Module({
    controllers: [],
    exports: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: RequestThrottleDefaultGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RequestThrottleRouteGuard,
        },
    ],
    imports: [
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule, RequestThrottleModule],
            inject: [ConfigService, RequestThrottleStorageService],
            useFactory: (
                config: ConfigService,
                storage: RequestThrottleStorageService
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
