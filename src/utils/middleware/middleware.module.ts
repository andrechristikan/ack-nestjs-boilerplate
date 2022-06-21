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
import { CompressionMiddleware } from './compression/compression.middleware';
import { MaintenanceMiddleware } from './maintenance/maintenance.middleware';
import { RequestIdMiddleware } from './request-id/request-id.middleware';
import { TimezoneMiddleware } from './timezone/timezone.middleware';
import { CustomLanguageMiddleware } from './custom-language/custom-language.middleware';
import { ResponseTimeMiddleware } from './response-time/response-time.middleware';
import { TimestampMiddleware } from './timestamp/timestamp.middleware';

@Module({})
export class MiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                RequestIdMiddleware,
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
                ResponseTimeMiddleware,
                TimestampMiddleware
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
