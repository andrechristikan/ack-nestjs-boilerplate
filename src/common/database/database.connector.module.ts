import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';

@Module({})
export class DatabaseConnectorModule {
    static forRoot(): DynamicModule {
        let module: DynamicModule;

        if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
            module = MongooseModule.forRootAsync({
                connectionName: DATABASE_CONNECTION_NAME,
                inject: [DatabaseOptionsService],
                imports: [DatabaseOptionsModule],
                useFactory: (databaseOptionsService: DatabaseOptionsService) =>
                    databaseOptionsService.createMongooseOptions(),
            });
        } else {
            module = TypeOrmModule.forRootAsync({
                name: DATABASE_CONNECTION_NAME,
                inject: [DatabaseOptionsService],
                imports: [DatabaseOptionsModule],
                useFactory: (
                    databaseOptionsService: DatabaseOptionsService
                ) => ({
                    ...databaseOptionsService.createTypeOrmOptions(),
                    entities: [
                        __dirname +
                            '/../../{modules,common}/**/schemas/*.postgres.schema{.ts,.js}',
                    ],
                    autoLoadEntities: true,
                }),
            });
        }

        return {
            module: DatabaseConnectorModule,
            providers: [],
            exports: [],
            controllers: [],
            imports: [module],
        };
    }
}
