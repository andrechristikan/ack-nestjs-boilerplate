import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { WorkerModule } from '@workers/worker.module';
import { RouterModule } from '@router';

/**
 * Root application module that orchestrates all feature modules.
 * Imports common utilities, routing configuration, and background worker functionality.
 */
@Module({
    controllers: [],
    providers: [],
    imports: [
        // Common
        CommonModule,

        // Routes
        RouterModule,

        // Workers
        WorkerModule,
    ],
})
export class AppModule {}
