import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseHeadersInterceptor } from './interceptors/response.headers.interceptor';
import { ResponseMiddlewareModule } from 'src/common/response/middleware/response.middleware.module';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseHeadersInterceptor,
        },
    ],
    imports: [ResponseMiddlewareModule],
})
export class ResponseModule {}
