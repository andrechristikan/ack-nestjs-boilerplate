import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptions } from 'src/common/database/interfaces/database.interface';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';

@Module({})
export class DatabaseModule {
    static register(options: DatabaseOptions): DynamicModule {
        const module =
            process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
                ? MongooseModule.forFeature(
                      [
                          {
                              name: options.name,
                              schema: options.schema,
                              collection: options.collection,
                          },
                      ],
                      options.connectionName
                  )
                : TypeOrmModule.forFeature(
                      [options.schema],
                      options.connectionName
                  );

        return {
            module: DatabaseModule,
            controllers: [],
            providers: [],
            exports: [module],
            imports: [module],
        };
    }
}

@Module({})
export class DatabaseConnectionModule {
    static register(): DynamicModule {
        if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
            return {
                module: DatabaseConnectionModule,
                controllers: [],
                providers: [],
                exports: [],
                imports: [
                    MongooseModule.forRootAsync({
                        connectionName: DATABASE_CONNECTION_NAME,
                        inject: [DatabaseOptionsService],
                        imports: [DatabaseOptionsModule],
                        useFactory: (
                            databaseOptionsService: DatabaseOptionsService
                        ) => databaseOptionsService.createMongooseOptions(),
                    }),
                ],
            };
        }

        return {
            module: DatabaseConnectionModule,
            controllers: [],
            providers: [],
            exports: [],
            imports: [
                TypeOrmModule.forRootAsync({
                    name: DATABASE_CONNECTION_NAME,
                    inject: [DatabaseOptionsService],
                    imports: [DatabaseOptionsModule],
                    useFactory: (
                        databaseOptionsService: DatabaseOptionsService
                    ) => databaseOptionsService.createTypeOrmOptions(),
                }),
            ],
        };
    }
}
