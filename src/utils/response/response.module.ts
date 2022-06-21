import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ResponseCustomHeadersInterceptor } from './interceptor/response.custom-headers.interceptor';
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
        {
            provide: APP_INTERCEPTOR,
            useFactory: () => new ResponseCustomHeadersInterceptor(),
        },
    ],
    imports: [],
})
export class ResponseModule {}
