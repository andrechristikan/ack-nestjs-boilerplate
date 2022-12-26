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
import { RequestRateLimitMiddleware } from 'src/common/request/middleware/rate-limit/request.rate-limit.middleware';
import { RequestVersionMiddleware } from 'src/common/request/middleware/version/request.version.middleware';

@Module({})
export class RequestMiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                RequestHelmetMiddleware,
                RequestRateLimitMiddleware,
                RequestIdMiddleware,
                RequestJsonBodyParserMiddleware,
                RequestTextBodyParserMiddleware,
                RequestRawBodyParserMiddleware,
                RequestUrlencodedBodyParserMiddleware,
                RequestCorsMiddleware,
                RequestVersionMiddleware
            )
            .forRoutes('*');
    }
}
