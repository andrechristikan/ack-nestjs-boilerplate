import {
    HttpDebuggerMiddleware,
    HttpDebuggerResponseMiddleware
} from 'src/middleware/http-debugger/http-debugger.middleware';
import { HelmetMiddleware } from 'src/middleware/helmet/helmet.middleware';
import { RateLimitMiddleware } from 'src/middleware/rate-limit/rate-limit.middleware';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

@Module({})
export class MiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                HttpDebuggerResponseMiddleware,
                HttpDebuggerMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware
            )
            .forRoutes('*');
    }
}
