import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ErrorHttpFilter } from './filters/error.http.filter';
import { ErrorValidationFilter } from 'src/common/error/filters/error.validation.filter';
import { ErrorGeneralFilter } from 'src/common/error/filters/error.general.filter';
import { ErrorValidationImportFilter } from 'src/common/error/filters/error.validation-import.filter';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ErrorGeneralFilter,
        },
        {
            provide: APP_FILTER,
            useClass: ErrorValidationFilter,
        },
        {
            provide: APP_FILTER,
            useClass: ErrorValidationImportFilter,
        },
        {
            provide: APP_FILTER,
            useClass: ErrorHttpFilter,
        },
    ],
    imports: [],
})
export class ErrorModule {}
