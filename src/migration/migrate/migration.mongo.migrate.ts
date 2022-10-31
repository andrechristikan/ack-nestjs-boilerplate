import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';
import { Connection } from 'mongoose';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import { ApiKeyDatabaseName } from 'src/common/api-key/schemas/api-key.schema';
import { LoggerDatabaseName } from 'src/common/logger/schemas/logger.schema';
import { SettingDatabaseName } from 'src/common/setting/schemas/setting.schema';

@Injectable()
export class MigrationMongoMigrate {
    constructor(
        @DatabaseConnection() private readonly connection: Connection,
        private readonly debuggerService: DebuggerService
    ) {}

    @Command({
        command: 'migrate',
        describe: 'migrates mongo',
    })
    async migrate(): Promise<void> {
        try {
            this.debuggerService.info(MigrationMongoMigrate.name, {
                description: 'Mongo migrate success',
                class: MigrationMongoMigrate.name,
                function: 'migrate',
            });
        } catch (err: any) {
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
            await this.connection.dropCollection(ApiKeyDatabaseName);
            await this.connection.dropCollection(LoggerDatabaseName);
            await this.connection.dropCollection(SettingDatabaseName);

            this.debuggerService.info(MigrationMongoMigrate.name, {
                description: 'Mongo rollback success',
                class: MigrationMongoMigrate.name,
                function: 'rollback',
            });
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
