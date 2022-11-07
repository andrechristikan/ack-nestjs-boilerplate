import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { CommonModule } from 'src/common/common.module';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
import { PermissionSeed } from 'src/migration/seeds/migration.permission.seed';
import { MigrationSettingSeed } from 'src/migration/seeds/migration.setting.seed';
import { PermissionModule } from 'src/modules/permission/permission.module';

@Module({
    imports: [CommonModule, CommandModule, ApiKeyModule, PermissionModule],
    providers: [MigrationApiKeySeed, MigrationSettingSeed, PermissionSeed],
    exports: [],
})
export class MigrationModule {}
