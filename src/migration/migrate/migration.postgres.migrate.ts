import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { DataSource } from 'typeorm';
import { ApiKeyDatabaseName } from 'src/common/api-key/schemas/api-key.schema';
import { LoggerDatabaseName } from 'src/common/logger/schemas/logger.schema';
import { SettingDatabaseName } from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class MigrationPostgresMigrate {
    constructor(
        @DatabaseConnection() private readonly dataSource: DataSource,
        private readonly debuggerService: DebuggerService
    ) {}

    @Command({
        command: 'migrate',
        describe: 'migrates postgres',
    })
    async migrate(): Promise<void> {
        try {
            // typeorm can automaticlly create the collection
            // but not for index
            // todo create index
            this.debuggerService.info(MigrationPostgresMigrate.name, {
                description: 'Postgres migrate success',
                class: MigrationPostgresMigrate.name,
                function: 'migrate',
            });
        } catch (err: any) {
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
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.dropTable(ApiKeyDatabaseName);
            await queryRunner.dropTable(LoggerDatabaseName);
            await queryRunner.dropTable(SettingDatabaseName);

            this.debuggerService.info(MigrationPostgresMigrate.name, {
                description: 'Postgres rollback success',
                class: MigrationPostgresMigrate.name,
                function: 'rollback',
            });
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
