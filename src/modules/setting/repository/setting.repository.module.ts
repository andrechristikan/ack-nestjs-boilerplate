import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import { SettingFeatureRepository } from '@modules/setting/repository/repositories/setting-feature.repository';
import {
    SettingFeatureEntity,
    SettingFeatureSchema,
} from '@modules/setting/repository/entities/setting-feature.entity';

@Module({
    providers: [SettingFeatureRepository],
    exports: [SettingFeatureRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: SettingFeatureEntity.name,
                    schema: SettingFeatureSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class SettingRepositoryModule {}
