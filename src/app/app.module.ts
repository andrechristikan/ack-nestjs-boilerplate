import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { RouterModule } from '@router';
import { APP_FILTER } from '@nestjs/core';
import { AppGeneralFilter } from '@app/filters/app.general.filter';
import { AppHttpFilter } from '@app/filters/app.http.filter';
import { AppValidationFilter } from '@app/filters/app.validation.filter';
import { AppValidationImportFilter } from '@app/filters/app.validation-import.filter';
import { QueueModule } from 'src/queues/queue.module';

/**
 * Root application module that serves as the entry point for the NestJS application.
 *
 * This module acts as the main orchestrator for the entire application, configuring
 * global exception filters and importing essential modules required for the application
 * to function properly.
 *
 * The module sets up four global exception filters that handle different types of errors:
 * - AppGeneralFilter: Handles general application exceptions
 * - AppHttpFilter: Manages HTTP-specific errors and responses
 * - AppValidationFilter: Processes validation errors from DTOs and input validation
 * - AppValidationImportFilter: Handles validation errors during data import operations
 *
 * Core modules imported:
 * - CommonModule: Provides shared services, utilities, and common functionality
 * - RouterModule: Configures application routing and API endpoints
 * - RouterQueueModule: Manages background job processing and queue operations
 *
 * This module follows NestJS best practices for application architecture and
 * provides a clean separation of concerns through modular design.
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
    imports: [CommonModule, RouterModule, QueueModule],
})
export class AppModule {}
