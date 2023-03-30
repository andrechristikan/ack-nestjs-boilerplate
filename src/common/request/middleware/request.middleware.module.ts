import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import {
    RequestJsonBodyParserMiddleware,
    RequestRawBodyParserMiddleware,
    RequestTextBodyParserMiddleware,
    RequestUrlencodedBodyParserMiddleware,
} from 'src/common/request/middleware/body-parser/request.body-parser.middleware';
import { RequestCorsMiddleware } from 'src/common/request/middleware/cors/request.cors.middleware';
import { RequestHelmetMiddleware } from 'src/common/request/middleware/helmet/request.helmet.middleware';
import { RequestIdMiddleware } from 'src/common/request/middleware/id/request.id.middleware';
import { RequestTimestampMiddleware } from 'src/common/request/middleware/timestamp/request.timestamp.middleware';
import { RequestTimezoneMiddleware } from 'src/common/request/middleware/timezone/request.timezone.middleware';
import { RequestUserAgentMiddleware } from 'src/common/request/middleware/user-agent/request.user-agent.middleware';

import { RequestVersionMiddleware } from 'src/common/request/middleware/version/request.version.middleware';

@Module({})
export class RequestMiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                RequestHelmetMiddleware,
                RequestIdMiddleware,
                RequestJsonBodyParserMiddleware,
                RequestTextBodyParserMiddleware,
                RequestRawBodyParserMiddleware,
                RequestUrlencodedBodyParserMiddleware,
                RequestCorsMiddleware,
                RequestVersionMiddleware,
                RequestUserAgentMiddleware,
                RequestTimestampMiddleware,
                RequestTimezoneMiddleware
            )
            .forRoutes('*');
    }
}
