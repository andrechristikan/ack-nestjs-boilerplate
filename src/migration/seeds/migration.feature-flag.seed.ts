import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationFeatureFlagData } from '@migration/data/migration.feature-flag.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Command } from 'nest-commander';

@Command({
    name: 'featureFlag',
    description: 'Seed/Remove Feature Flags',
    allowUnknownOptions: false,
})
export class MigrationFeatureFlagSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationFeatureFlagSeed.name);

    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly featureFlags: Prisma.FeatureFlagCreateInput[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.featureFlags = migrationFeatureFlagData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Feature Flags...');
        this.logger.log(
            `Found ${this.featureFlags.length} Feature Flags to seed.`
        );

        await this.databaseService.$transaction(
            this.featureFlags.map(featureFlag =>
                this.databaseService.featureFlag.upsert({
                    where: {
                        key: featureFlag.key,
                    },
                    create: featureFlag,
                    update: {},
                })
            )
        );

        this.logger.log('Feature Flags seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Feature Flags...');

        await this.databaseService.featureFlag.deleteMany({});

        this.logger.log('Feature Flags removed successfully.');

        return;
    }
}
