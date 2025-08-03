import { Module } from '@nestjs/common';
import { DatabaseOptionService } from '@common/database/services/database.options.service';

/**
 * Database options module for providing database configuration services.
 *
 * Exports DatabaseOptionService for database connection configuration
 * and settings management across the application.
 */
@Module({
    providers: [DatabaseOptionService],
    exports: [DatabaseOptionService],
    imports: [],
    controllers: [],
})
export class DatabaseOptionModule {}
