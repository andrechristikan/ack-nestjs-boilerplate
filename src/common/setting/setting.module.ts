import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { SETTING_REPOSITORY } from 'src/common/setting/constants/setting.constant';
import { SettingMongoRepository } from 'src/common/setting/repositories/setting.mongo.repository';
import { SettingPostgresRepository } from 'src/common/setting/repositories/setting.postgres.repository';
import { SettingMongoSchema } from 'src/common/setting/schemas/setting.mongo.schema';
import { SettingPostgresSchema } from 'src/common/setting/schemas/setting.postgres.schema';
import { SettingDatabaseName, SettingEntity } from './schemas/setting.schema';
import { SettingBulkService } from './services/setting.bulk.service';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [
        DatabaseConnectModule.register({
            schema: {
                name: SettingEntity.name,
                mongo: SettingMongoSchema,
                postgres: SettingPostgresSchema,
            },
            repository: {
                name: SETTING_REPOSITORY,
                mongo: SettingMongoRepository,
                postgres: SettingPostgresRepository,
            },
            collection: SettingDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    exports: [SettingService, SettingBulkService],
    providers: [SettingService, SettingBulkService],
    controllers: [],
})
export class SettingModule {}
