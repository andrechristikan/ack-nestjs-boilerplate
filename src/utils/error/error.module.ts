import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorHttpFilter } from './filter/error.filter';
import { ErrorLogInterceptor } from './interceptor/error.log.interceptor';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ErrorHttpFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ErrorLogInterceptor,
        },
    ],
    imports: [],
})
export class ErrorModule {}
