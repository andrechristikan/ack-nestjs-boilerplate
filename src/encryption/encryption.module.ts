import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { EncryptionMiddleware } from 'src/encryption/encryption.middleware';

@Module({})
export class EncryptionModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        //! middleware
        consumer.apply(EncryptionMiddleware).forRoutes('*');
    }
}
