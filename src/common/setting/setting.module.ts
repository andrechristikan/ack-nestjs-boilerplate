import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseModule } from 'src/common/database/database.module';
import { SettingBulkRepository } from 'src/common/setting/repositories/setting.bulk.repository';
import { SettingRepository } from 'src/common/setting/repositories/setting.repository';
import {
    Setting,
    SettingDatabaseName,
    SettingEntity,
} from './schemas/setting.schema';
import { SettingBulkService } from './services/setting.bulk.service';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [
        DatabaseModule.register({
            name: SettingEntity.name,
            schema: Setting,
            collection: SettingDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    exports: [SettingService, SettingBulkService],
    providers: [
        SettingService,
        SettingBulkService,
        SettingRepository,
        SettingBulkRepository,
    ],
    controllers: [],
})
export class SettingModule {}
