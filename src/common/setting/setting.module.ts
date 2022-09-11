import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { SettingBulkRepository } from 'src/common/setting/repositories/setting.bulk.repository';
import { SettingRepository } from 'src/common/setting/repositories/setting.repository';
import {
    SettingDatabaseName,
    SettingEntity,
    SettingSchema,
} from './schemas/setting.schema';
import { SettingBulkService } from './services/setting.bulk.service';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: SettingEntity.name,
                    schema: SettingSchema,
                    collection: SettingDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
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
