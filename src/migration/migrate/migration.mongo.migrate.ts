import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { ApiKeyEntity } from 'src/common/api-key/schemas/api-key.schema';
import { DatabaseRepository } from 'src/common/database/decorators/database.decorator';
import { API_KEY_REPOSITORY } from 'src/common/api-key/constants/api-key.constant';
import { SETTING_REPOSITORY } from 'src/common/setting/constants/setting.constant';
import { LOGGER_REPOSITORY } from 'src/common/logger/constants/logger.constant';
import { SettingEntity } from 'src/common/setting/schemas/setting.schema';
import { LoggerEntity } from 'src/common/logger/schemas/logger.schema';

@Injectable()
export class MigrationMongoMigrate {
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
        describe: 'migrate mongo',
    })
    async migrate(): Promise<void> {
        try {
            await this.apiKeyRepository.createTable();
            await this.settingRepository.createTable();
            await this.loggerRepository.createTable();
        } catch (err: any) {
            console.error('err', err);
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'rollback',
        describe: 'rollback mongo',
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
