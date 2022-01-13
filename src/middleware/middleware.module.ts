import {
    HttpDebuggerMiddleware,
    HttpDebuggerResponseMiddleware
} from 'src/middleware/http-debugger/http-debugger.middleware';
import { HelmetMiddleware } from 'src/middleware/helmet/helmet.middleware';
import { RateLimitMiddleware } from 'src/middleware/rate-limit/rate-limit.middleware';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CorsMiddleware } from './cors/cors.middleware';
import { BodyParserMiddleware } from './body-parser/body-parser.middleware';

@Module({})
export class MiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                HttpDebuggerResponseMiddleware,
                HttpDebuggerMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware,
                CorsMiddleware,
                BodyParserMiddleware
            )
            .forRoutes('*');
    }
}
