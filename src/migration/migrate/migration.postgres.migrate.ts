import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import {
    ApiKeyDatabaseName,
    ApiKeyEntity,
} from 'src/common/api-key/schemas/api-key.schema';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { API_KEY_REPOSITORY } from 'src/common/api-key/constants/api-key.constant';
import { SETTING_REPOSITORY } from 'src/common/setting/constants/setting.constant';
import { LOGGER_REPOSITORY } from 'src/common/logger/constants/logger.constant';
import {
    SettingDatabaseName,
    SettingEntity,
} from 'src/common/setting/schemas/setting.schema';
import {
    LoggerDatabaseName,
    LoggerEntity,
} from 'src/common/logger/schemas/logger.schema';
import {
    Table,
    TableCheck,
    TableColumn,
    TableExclusion,
    TableForeignKey,
    TableIndex,
    TableUnique,
} from 'typeorm';

@Injectable()
export class MigrationPostgresMigrate {
    constructor(
        @DatabaseRepository(API_KEY_REPOSITORY)
        private readonly apiKeyRepository: IDatabaseRepository<ApiKeyEntity>,
        @DatabaseRepository(SETTING_REPOSITORY)
        private readonly settingRepository: IDatabaseRepository<SettingEntity>,
        @DatabaseRepository(LOGGER_REPOSITORY)
        private readonly loggerRepository: IDatabaseRepository<LoggerEntity>
    ) {}

    @Command({
        command: 'migrate',
        describe: 'migrate postgres',
    })
    async migrate(): Promise<void> {
        try {
            await this.apiKeyRepository.createTable<Table>(
                new Table({
                    name: ApiKeyDatabaseName,
                    columns: [] as TableColumn[],
                    // indices: [] as TableIndex[],
                    // foreignKeys: [] as TableForeignKey[],
                    // uniques: [] as TableUnique[],
                })
            );
            await this.settingRepository.createTable<Table>(
                new Table({
                    name: SettingDatabaseName,
                    columns: [] as TableColumn[],
                    // indices: [] as TableIndex[],
                    // foreignKeys: [] as TableForeignKey[],
                    // uniques: [] as TableUnique[],
                })
            );
            await this.loggerRepository.createTable<Table>(
                new Table({
                    name: LoggerDatabaseName,
                    columns: [] as TableColumn[],
                    // indices: [] as TableIndex[],
                    // foreignKeys: [] as TableForeignKey[],
                    // uniques: [] as TableUnique[],
                })
            );
        } catch (err: any) {
            console.error('err', err);
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'rollback',
        describe: 'rollback postgres',
    })
    async rollback(): Promise<void> {
        try {
            await this.apiKeyRepository.clearTable();
            await this.settingRepository.clearTable();
            await this.loggerRepository.clearTable();
        } catch (err: any) {
            console.error('err', err);
            throw new Error(err.message);
        }

        return;
    }
}
