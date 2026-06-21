import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { RouterModule } from '@router';
import { APP_FILTER } from '@nestjs/core';
import { AppBaseExceptionFilter } from '@app/filters/app.base-exception.filter';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { AppHttpFilter } from '@app/filters/app.http.filter';
import { AppValidationFilter } from '@app/filters/app.validation.filter';
import { AppValidationImportFilter } from '@app/filters/app.validation-import.filter';
import { QueueModule } from '@queues/queue.module';

/**
 * Root module: registers the global exception filters and imports Common, Queue, and Router.
 */
@Module({
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: AppGeneralFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppBaseExceptionFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppHttpFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppValidationFilter,
        },
        {
            provide: APP_FILTER,
            useClass: AppValidationImportFilter,
        },
    ],
    imports: [CommonModule, QueueModule, RouterModule],
})
export class AppModule {}
