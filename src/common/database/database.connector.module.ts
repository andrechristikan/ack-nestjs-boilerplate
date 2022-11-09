import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { LoggerPostgresEntity } from 'src/common/logger/repository/entities/logger.postgres.entity';
import { SettingPostgresEntity } from 'src/common/setting/repository/entities/setting.postgres.entity';
import { PermissionPostgresEntity } from 'src/modules/permission/repository/entities/permission.postgres.entity';
import { RolePostgresEntity } from 'src/modules/role/repository/entities/role.postgres.entity';
import { UserPostgresEntity } from 'src/modules/user/repository/entities/user.postgres.entity';

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
                            '/../../{common,modules}/**/**/repository/entities/*.postgres.entity{.ts,.js}',
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
