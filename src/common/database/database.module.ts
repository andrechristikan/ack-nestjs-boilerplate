import { DatabaseService } from '@common/database/services/database.service';
import { DynamicModule, Global, Module } from '@nestjs/common';

/**
 * Global database module that provides database services throughout the application
 */
@Global()
@Module({})
export class DatabaseModule {
    /**
     * Creates and configures the database module as a dynamic module
     * @returns {DynamicModule} Configured dynamic module with DatabaseService provider and export
     */
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            providers: [DatabaseService],
            exports: [DatabaseService],
            imports: [],
            controllers: [],
        };
    }
}
