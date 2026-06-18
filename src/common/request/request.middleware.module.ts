import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
    ThrottlerGuard,
    ThrottlerModule,
    ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { RequestRequestIdMiddleware } from '@common/request/middlewares/request.request-id.middleware';
import { RequestRequestLogMiddleware } from '@common/request/middlewares/request.request-log.middleware';
import { RequestHelmetMiddleware } from '@common/request/middlewares/request.helmet.middleware';
import { RequestBodyParserMiddleware } from '@common/request/middlewares/request.body-parser.middleware';
import { RequestCorsMiddleware } from '@common/request/middlewares/request.cors.middleware';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';
import { RequestResponseTimeMiddleware } from '@common/request/middlewares/request.response-time.middleware';
import { RequestCustomLanguageMiddleware } from '@common/request/middlewares/request.custom-language.middleware';
import { RequestCompressionMiddleware } from '@common/request/middlewares/request.compression.middleware';
import { SentryModule } from '@sentry/nestjs/setup';

/**
 * Registers the throttler guard and applies the security/perf/monitoring middleware chain to all routes.
 */
@Module({
    controllers: [],
    exports: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
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
                        ttl: config.get<number>('request.throttle.ttlInMs')!,
                        limit: config.get<number>('request.throttle.limit')!,
                    },
                ],
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
                RequestCompressionMiddleware
            )
            .forRoutes('{*wildcard}');
    }
}
