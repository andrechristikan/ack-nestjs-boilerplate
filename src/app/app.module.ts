import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { WorkerModule } from '@workers/worker.module';
import { RouterModule } from '@router';
import { APP_FILTER } from '@nestjs/core';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { AppHttpFilter } from '@app/filters/app.http.filter';
import { AppValidationFilter } from '@app/filters/app.validation.filter';
import { AppValidationImportFilter } from '@app/filters/app.validation-import.filter';

/**
 * Root application module that serves as the entry point for the NestJS application.
 *
 * Configures global exception filters and imports core application modules
 * (CommonModule, RouterModule, WorkerModule).
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
    imports: [CommonModule, RouterModule, WorkerModule],
})
export class AppModule {}
