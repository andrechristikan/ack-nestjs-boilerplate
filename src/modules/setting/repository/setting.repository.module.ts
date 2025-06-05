import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import { SettingRepository } from '@modules/setting/repository/repositories/setting.repository';
import {
    SettingEntity,
    SettingSchema,
} from '@modules/setting/repository/entities/setting.entity';

@Module({
    providers: [SettingRepository],
    exports: [SettingRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: SettingEntity.name,
                    schema: SettingSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class SettingRepositoryModule {}
