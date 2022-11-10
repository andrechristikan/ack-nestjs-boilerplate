import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    SettingEntity,
    SettingSchema,
} from 'src/common/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/common/setting/repository/repositories/setting.repository';

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
