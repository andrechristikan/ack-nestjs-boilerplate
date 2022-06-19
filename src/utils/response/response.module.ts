import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ResponseTimeoutDefaultInterceptor } from './interceptor/response.timeout.interceptor';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            inject: [ConfigService, Reflector],
            useFactory: (configService: ConfigService, reflector: Reflector) =>
                new ResponseTimeoutDefaultInterceptor(configService, reflector),
        },
    ],
    imports: [],
})
export class ResponseModule {}
