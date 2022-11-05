import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { SettingDatabaseName } from 'src/common/setting/repository/entities/setting.entity';
import {
    SettingMongoEntity,
    SettingMongoSchema,
} from 'src/common/setting/repository/entities/setting.mongo.entity';
import { SettingRepositoryProvider } from 'src/common/setting/repository/providers/setting.repository.provider';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: SettingMongoEntity.name,
                    schema: SettingMongoSchema,
                    collection: SettingDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
    exports: [SettingRepositoryProvider],
    providers: [SettingRepositoryProvider],
    controllers: [],
})
export class SettingRepositoryModule {}
