import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ErrorFilter } from './filter/error.filter';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ErrorFilter,
        },
    ],
    imports: [],
})
export class ErrorModule {}
