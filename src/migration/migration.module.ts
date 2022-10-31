import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { API_KEY_REPOSITORY } from 'src/common/api-key/constants/api-key.constant';
import { ApiKeyMongoRepository } from 'src/common/api-key/repositories/api-key.mongo.repository';
import { ApiKeyPostgresRepository } from 'src/common/api-key/repositories/api-key.postgres.repository';
import { ApiKeyMongoSchema } from 'src/common/api-key/schemas/api-key.mongo.schema';
import { ApiKeyPostgresSchema } from 'src/common/api-key/schemas/api-key.postgres.schema';
import {
    ApiKeyDatabaseName,
    ApiKeyEntity,
} from 'src/common/api-key/schemas/api-key.schema';
import { CommonModule } from 'src/common/common.module';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { LOGGER_REPOSITORY } from 'src/common/logger/constants/logger.constant';
import { LoggerMongoRepository } from 'src/common/logger/repositories/logger.mongo.repository';
import { LoggerPostgresRepository } from 'src/common/logger/repositories/logger.postgres.repository';
import { LoggerMongoSchema } from 'src/common/logger/schemas/logger.mongo.schema';
import { LoggerPostgresSchema } from 'src/common/logger/schemas/logger.postgres.schema';
import {
    LoggerDatabaseName,
    LoggerEntity,
} from 'src/common/logger/schemas/logger.schema';
import { SETTING_REPOSITORY } from 'src/common/setting/constants/setting.constant';
import { SettingMongoRepository } from 'src/common/setting/repositories/setting.mongo.repository';
import { SettingPostgresRepository } from 'src/common/setting/repositories/setting.postgres.repository';
import { SettingMongoSchema } from 'src/common/setting/schemas/setting.mongo.schema';
import { SettingPostgresSchema } from 'src/common/setting/schemas/setting.postgres.schema';
import {
    SettingDatabaseName,
    SettingEntity,
} from 'src/common/setting/schemas/setting.schema';
import { MIGRATION_PROVIDER_NAME } from 'src/migration/constants/migration.constant';
import { MigrationMongoMigrate } from 'src/migration/migrate/migration.mongo.migrate';
import { MigrationPostgresMigrate } from 'src/migration/migrate/migration.postgres.migrate';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
import { MigrationSettingSeed } from 'src/migration/seeds/migration.setting.seed';

@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        DatabaseConnectModule.register({
            schema: {
                name: ApiKeyEntity.name,
                mongo: ApiKeyMongoSchema,
                postgres: ApiKeyPostgresSchema,
            },
            repository: {
                name: API_KEY_REPOSITORY,
                mongo: ApiKeyMongoRepository,
                postgres: ApiKeyPostgresRepository,
            },
            collection: ApiKeyDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
        DatabaseConnectModule.register({
            schema: {
                name: LoggerEntity.name,
                mongo: LoggerMongoSchema,
                postgres: LoggerPostgresSchema,
            },
            repository: {
                name: LOGGER_REPOSITORY,
                mongo: LoggerMongoRepository,
                postgres: LoggerPostgresRepository,
            },
            collection: LoggerDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
        DatabaseConnectModule.register({
            schema: {
                name: SettingEntity.name,
                mongo: SettingMongoSchema,
                postgres: SettingPostgresSchema,
            },
            repository: {
                name: SETTING_REPOSITORY,
                mongo: SettingMongoRepository,
                postgres: SettingPostgresRepository,
            },
            collection: SettingDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
    providers: [
        {
            useClass:
                process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
                    ? MigrationMongoMigrate
                    : MigrationPostgresMigrate,
            provide: MIGRATION_PROVIDER_NAME,
        },
        MigrationApiKeySeed,
        MigrationSettingSeed,
    ],
    exports: [],
})
export class MigrationModule {}
