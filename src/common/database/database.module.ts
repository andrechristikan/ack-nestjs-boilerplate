import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseClientToken } from '@common/database/constants/database.constant';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { IDatabaseClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseExtensionUtil } from '@common/database/utils/database.extension.util';
import { DatabaseUtil } from '@common/database/utils/database.util';

/**
 * Global module exposing `DatabaseService` and `DatabaseUtil` app-wide.
 */
@Module({})
export class DatabaseModule {
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            global: true,
            providers: [
                DatabaseExtensionUtil,
                DatabaseClientFactory,
                {
                    provide: DatabaseClientToken,
                    useFactory: (
                        databaseClientFactory: DatabaseClientFactory
                    ): IDatabaseClient => databaseClientFactory.create(),
                    inject: [DatabaseClientFactory],
                },
                DatabaseService,
                DatabaseUtil,
            ],
            exports: [DatabaseService, DatabaseUtil],
            imports: [],
            controllers: [],
        };
    }
}
