import {
    Module,
    NestModule,
    MiddlewareConsumer,
    RequestMethod,
} from '@nestjs/common';
import { CorsMiddleware } from './cors/cors.middleware';
import {
    HtmlBodyParserMiddleware,
    JsonBodyParserMiddleware,
    RawBodyParserMiddleware,
    TextBodyParserMiddleware,
    UrlencodedBodyParserMiddleware,
} from './body-parser/body-parser.middleware';
import {
    HttpDebuggerMiddleware,
    HttpDebuggerResponseMiddleware,
} from './http-debugger/http-debugger.middleware';
import { HelmetMiddleware } from './helmet/helmet.middleware';
import { RateLimitMiddleware } from './rate-limit/rate-limit.middleware';
import { UserAgentMiddleware } from './user-agent/user-agent.middleware';
import { TimestampMiddleware } from './timestamp/timestamp.middleware';
import { CompressionMiddleware } from './compression/compression.middleware';
import { MaintenanceMiddleware } from './maintenance/maintenance.middleware';
import { RequestMiddleware } from './request/request.middleware';
import { TimezoneMiddleware } from './timezone/timezone.middleware';
import { CustomLanguageMiddleware } from './custom-language/custom-language.middleware';
import { ResponseTimeMiddleware } from './response-time/response-time.middleware';

@Module({})
export class MiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                RequestMiddleware,
                TimezoneMiddleware,
                JsonBodyParserMiddleware,
                RawBodyParserMiddleware,
                HtmlBodyParserMiddleware,
                TextBodyParserMiddleware,
                UrlencodedBodyParserMiddleware,
                CompressionMiddleware,
                CorsMiddleware,
                HttpDebuggerResponseMiddleware,
                HttpDebuggerMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware,
                UserAgentMiddleware,
                CustomLanguageMiddleware,
                ResponseTimeMiddleware
            )
            .forRoutes('*');

        consumer
            .apply(TimestampMiddleware)
            .exclude(
                {
                    path: 'api/v:version*/callback/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/callback/(.*)',
                    method: RequestMethod.ALL,
                }
            )
            .forRoutes('*');

        consumer
            .apply(MaintenanceMiddleware)
            .exclude(
                {
                    path: 'api/v:version*/auth/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/auth/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/v:version*/auth/refresh',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/auth/refresh',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/v:version*/admin/setting/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/admin/setting/(.*)',
                    method: RequestMethod.ALL,
                }
            )
            .forRoutes('*');
    }
}
