import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { DatabaseOptions } from 'src/common/database/interfaces/database.interface';

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
