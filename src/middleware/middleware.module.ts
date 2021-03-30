import { HttpLoggerMiddleware, HttpLoggerResponseMiddleware } from 'src/middleware/http-logger/http-logger.middleware';
import { HelmetMiddleware } from 'src/middleware/helmet/helmet.middleware';
import { RateLimitMiddleware } from 'src/middleware/rate-limit/rate-limit.middleware';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

@Module({})
export class MiddlewareModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        //! middleware
        consumer
            .apply(
                HttpLoggerResponseMiddleware,
                HttpLoggerMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware
            )
            .forRoutes('*');
    }
}
