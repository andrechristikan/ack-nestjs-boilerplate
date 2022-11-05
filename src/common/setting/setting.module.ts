import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseRepositoryModule } from 'src/common/database/database.repository.module';
import { SettingRepository } from 'src/common/setting/repository/entities/setting.entity';
import {
    SettingMongoEntity,
    SettingMongoSchema,
} from 'src/common/setting/repository/entities/setting.mongo.entity';
import { SettingPostgresEntity } from 'src/common/setting/repository/entities/setting.postgres.entity';
import { SettingMongoRepository } from 'src/common/setting/repository/repositories/setting.mongo.repository';
import { SettingPostgresRepository } from 'src/common/setting/repository/repositories/setting.postgres.repository';
import { SettingBulkService } from './services/setting.bulk.service';
import { SettingService } from './services/setting.service';

@Global()
@Module({
    imports: [
        DatabaseRepositoryModule.forFutureAsync({
            name: SettingRepository,
            mongo: {
                schema: SettingMongoSchema,
                entity: SettingMongoEntity,
                repository: SettingMongoRepository,
            },
            postgres: {
                entity: SettingPostgresEntity,
                repository: SettingPostgresRepository,
            },
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    exports: [SettingService, SettingBulkService],
    providers: [SettingService, SettingBulkService],
    controllers: [],
})
export class SettingModule {}
