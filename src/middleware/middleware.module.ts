import { EncryptionMiddleware } from 'src/middleware/encryption/encryption.middleware';
import { HttpLoggerMiddleware } from 'src/middleware/http-logger/http-logger.middleware';
import { BodyParserUrlencodedMiddleware } from 'src/middleware/body-parser/body-parser-urlencoded.middleware';
import { BodyParserJsonMiddleware } from 'src/middleware/body-parser/body-parser-json.middleware';
import { ResponseBodyMiddleware } from 'src/middleware/response/response.middleware';
import { HelmetMiddleware } from 'src/middleware/helmet/helmet.middleware';
import { RateLimitMiddleware } from 'src/middleware/rate-limit/rate-limit.middleware';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

@Module({})
export class MiddlewareBeforeModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        //! middleware
        consumer
            .apply(
                ResponseBodyMiddleware,
                HttpLoggerMiddleware,
                BodyParserUrlencodedMiddleware,
                BodyParserJsonMiddleware,
                HelmetMiddleware,
                RateLimitMiddleware
            )
            .forRoutes('*');
    }
}

@Module({})
export class MiddlewareAfterModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        //! middleware
        consumer.apply(EncryptionMiddleware).forRoutes('*');
    }
}
