import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { ApiKeyRepositoryModule } from '@modules/api-key/repository/api-key.repository.module';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';

@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        ApiKeyRepositoryModule,
    ],
    providers: [MigrationApiKeySeed, MigrationCountrySeed],
    exports: [],
})
export class MigrationModule {}
