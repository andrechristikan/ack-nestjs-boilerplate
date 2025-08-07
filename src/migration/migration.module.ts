import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { ApiKeyModule } from '@modules/api-key/api-key.module';

@Module({
    imports: [CommonModule, CommandModule, ApiKeyModule],
    providers: [MigrationApiKeySeed],
    exports: [],
})
export class MigrationModule {}
