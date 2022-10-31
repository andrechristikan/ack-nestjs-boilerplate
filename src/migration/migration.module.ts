import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyPostgresEntity } from 'src/common/api-key/schemas/api-key.postgres.schema';
import { CommonModule } from 'src/common/common.module';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { LoggerPostgresEntity } from 'src/common/logger/schemas/logger.postgres.schema';
import { SettingPostgresEntity } from 'src/common/setting/schemas/setting.postgres.schema';
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
        TypeOrmModule.forRootAsync({
            name: `${DATABASE_CONNECTION_NAME}-MIGRATION`,
            inject: [DatabaseOptionsService],
            imports: [DatabaseOptionsModule],
            useFactory: (databaseOptionsService: DatabaseOptionsService) => ({
                ...databaseOptionsService.createTypeOrmOptions(),
                entities: [
                    ApiKeyPostgresEntity,
                    LoggerPostgresEntity,
                    SettingPostgresEntity,
                ],
            }),
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
