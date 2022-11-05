import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum';
import { IDatabaseRepositoryModuleOptions } from 'src/common/database/interfaces/database.interface';

@Module({})
export class DatabaseRepositoryModule {
    static async forFutureAsync(
        options: IDatabaseRepositoryModuleOptions
    ): Promise<DynamicModule> {
        let provider: Provider;
        let module: DynamicModule;

        // await config module
        await ConfigModule.envVariablesLoaded;

        if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
            if (!options.mongo) {
                throw new Error('Invalid mongo repository options');
            }

            provider = {
                provide: options.name,
                useClass: options.mongo.repository,
            };

            module = MongooseModule.forFeature(
                [
                    {
                        name: options.mongo.entity.name,
                        schema: options.mongo.schema,
                    },
                ],
                options.connectionName || DATABASE_CONNECTION_NAME
            );
        } else if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.POSTGRES) {
            if (!options.postgres) {
                throw new Error('Invalid postgres repository options');
            }

            provider = {
                provide: options.name,
                useClass: options.postgres.repository,
            };

            module = TypeOrmModule.forFeature(
                [options.postgres.entity],
                options.connectionName || DATABASE_CONNECTION_NAME
            );
        }

        return {
            module: DatabaseRepositoryModule,
            providers: [provider],
            exports: [provider],
            controllers: [],
            imports: [module],
        };
    }
}
