import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseMiddlewareModule } from 'src/common/response/middleware/response.middleware.module';
import { ResponseCustomHeadersInterceptor } from './interceptors/response.custom-headers.interceptor';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseCustomHeadersInterceptor,
        },
    ],
    imports: [ResponseMiddlewareModule],
})
export class ResponseModule {}
