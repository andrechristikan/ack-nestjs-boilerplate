import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { CommonModule } from 'src/common/common.module';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
import { MigrationSettingSeed } from 'src/migration/seeds/migration.setting.seed';

@Module({
    imports: [CommonModule, CommandModule, ApiKeyModule],
    providers: [MigrationApiKeySeed, MigrationSettingSeed],
    exports: [],
})
export class MigrationModule {}
