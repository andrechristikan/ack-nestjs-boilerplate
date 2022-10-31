import { ClassProvider, DynamicModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { IDatabaseConnectOptions } from 'src/common/database/interfaces/database.interface';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { DatabaseService } from 'src/common/database/services/database.service';

@Global()
@Module({
    controllers: [],
    providers: [DatabaseService],
    exports: [DatabaseService],
    imports: [],
})
export class DatabaseModule {}

@Module({})
export class DatabaseConnectModule {
    static register(options: IDatabaseConnectOptions): DynamicModule {
        if (
            process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO &&
            (!options.schema.mongo || !options.repository.mongo)
        ) {
            throw new Error(
                `${ENUM_DATABASE_TYPE.MONGO} must have schema and repository`
            );
        } else if (
            process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.POSTGRES &&
            (!options.schema.postgres || !options.repository.postgres)
        ) {
            throw new Error(
                `${ENUM_DATABASE_TYPE.POSTGRES} must have schema and repository`
            );
        }

        const module =
            process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
                ? MongooseModule.forFeature(
                      [
                          {
                              name: options.schema.name,
                              schema: options.schema.mongo,
                              collection: options.collection,
                          },
                      ],
                      options.connectionName ?? DATABASE_CONNECTION_NAME
                  )
                : TypeOrmModule.forFeature(
                      [
                          options.schema.postgres,
                          {
                              options: {
                                  name: options.schema.name,
                                  tableName: options.collection,
                                  schema: options.schema.postgres,
                              },
                          },
                      ],
                      options.connectionName ?? DATABASE_CONNECTION_NAME
                  );

        const repository: ClassProvider<any> = {
            useClass:
                process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
                    ? options.repository.mongo
                    : options.repository.postgres,
            provide: options.repository.name,
        };

        return {
            module: DatabaseConnectModule,
            controllers: [],
            providers: [repository],
            exports: [module, repository],
            imports: [module],
        };
    }
}

@Module({})
export class DatabaseInitModule {
    static register(): DynamicModule {
        if (process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO) {
            return {
                module: DatabaseInitModule,
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
            module: DatabaseInitModule,
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
