import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DynamicModule, Module } from '@nestjs/common';

/**
 * Global database module that provides database services throughout the application.
 */
@Module({})
export class DatabaseModule {
    /**
     * Configures and returns the dynamic database module.
     *
     * Registers `DatabaseService` and `DatabaseUtil` as providers and exports
     * them for use across the application. Marked `@Global()` so importing
     * this module once at the app level makes both providers available everywhere.
     *
     * @returns {DynamicModule} The configured dynamic module definition
     */
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            global: true,
            providers: [DatabaseService, DatabaseUtil],
            exports: [DatabaseService, DatabaseUtil],
            imports: [],
            controllers: [],
        };
    }
}
