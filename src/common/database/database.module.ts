import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DynamicModule, Module } from '@nestjs/common';

/**
 * Global module exposing `DatabaseService` and `DatabaseUtil` app-wide.
 */
@Module({})
export class DatabaseModule {
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
