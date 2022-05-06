import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/database/database.constant';
import { SettingService } from './service/setting.service';
import {
    SettingDatabaseName,
    SettingEntity,
    SettingSchema,
} from './schema/setting.schema';

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
    exports: [SettingService],
    providers: [SettingService],
    controllers: [],
})
export class SettingModule {}
