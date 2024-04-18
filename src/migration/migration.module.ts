import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { CommonModule } from 'src/common/common.module';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
@Module({
    imports: [CommonModule, CommandModule, ApiKeyModule],
    providers: [MigrationApiKeySeed],
    exports: [],
})
export class MigrationModule {}
