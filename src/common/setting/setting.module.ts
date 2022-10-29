import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { SettingRepository } from 'src/common/setting/repositories/setting.repository';
import {
    SettingSchema,
    SettingDatabaseName,
    SettingEntity,
} from './schemas/setting.schema';
import { SettingBulkService } from './services/setting.bulk.service';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [
        DatabaseConnectModule.register({
            name: SettingEntity.name,
            schema: SettingSchema,
            collection: SettingDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    exports: [SettingService, SettingBulkService],
    providers: [SettingService, SettingBulkService, SettingRepository],
    controllers: [],
})
export class SettingModule {}
