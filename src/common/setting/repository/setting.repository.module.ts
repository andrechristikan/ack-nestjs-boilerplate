import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import {
    SettingDatabaseName,
    SettingEntity,
    SettingRepositoryName,
} from 'src/common/setting/repository/entities/setting.entity';
import { SettingMongoSchema } from 'src/common/setting/repository/entities/setting.mongo.entity';
import { SettingMongoRepository } from 'src/common/setting/repository/repositories/setting.mongo.repository';

const provider = {
    useClass: SettingMongoRepository,
    provide: SettingRepositoryName,
};

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: SettingEntity.name,
                    schema: SettingMongoSchema,
                    collection: SettingDatabaseName,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
    exports: [provider],
    providers: [provider],
    controllers: [],
})
export class SettingRepositoryModule {}
