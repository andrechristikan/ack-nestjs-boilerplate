import {
    Module,
    NestModule,
    MiddlewareConsumer,
    RequestMethod,
} from '@nestjs/common';
import { CorsMiddleware } from './cors/cors.middleware';
import {
    JsonBodyParserMiddleware,
    RawBodyParserMiddleware,
    TextBodyParserMiddleware,
    UrlencodedBodyParserMiddleware,
} from './body-parser/body-parser.middleware';
import {
    HttpDebuggerMiddleware,
    HttpDebuggerResponseMiddleware,
    HttpDebuggerWriteIntoConsoleMiddleware,
    HttpDebuggerWriteIntoFileMiddleware,
} from './http-debugger/http-debugger.middleware';
import { HelmetMiddleware } from './helmet/helmet.middleware';
import { RateLimitMiddleware } from './rate-limit/rate-limit.middleware';
import { UserAgentMiddleware } from './user-agent/user-agent.middleware';
import { RequestIdMiddleware } from './request-id/request-id.middleware';
import { ResponseTimeMiddleware } from './response-time/response-time.middleware';
import { CustomLanguageMiddleware } from './custom-language/custom-language.middleware';
import { VersionMiddleware } from './version/version.middleware';
import { MaintenanceMiddleware } from 'src/common/middleware/maintenance/maintenance.middleware';

@Module({})
export class MiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                RequestIdMiddleware,
                JsonBodyParserMiddleware,
                TextBodyParserMiddleware,
                RawBodyParserMiddleware,
                UrlencodedBodyParserMiddleware,
                CorsMiddleware,
                HttpDebuggerResponseMiddleware,
                HttpDebuggerMiddleware,
                HttpDebuggerWriteIntoConsoleMiddleware,
                HttpDebuggerWriteIntoFileMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware,
                UserAgentMiddleware,
                CustomLanguageMiddleware,
                ResponseTimeMiddleware,
                VersionMiddleware
            )
            .forRoutes('*')
            .apply(MaintenanceMiddleware)
            .exclude(
                {
                    path: 'api/v:version*/user/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/user/login',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/v:version*/user/refresh',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/user/refresh',
                    method: RequestMethod.POST,
                },
                {
                    path: 'api/v:version*/admin/setting/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/admin/setting/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/v:version*/setting/(.*)',
                    method: RequestMethod.ALL,
                },
                {
                    path: 'api/setting/(.*)',
                    method: RequestMethod.ALL,
                }
            )
            .forRoutes('*');
    }
}
