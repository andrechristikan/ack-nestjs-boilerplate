import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationFeatureFlagData } from '@migration/data/migration.feature-flag.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@generated/prisma-client/client';
import { Command } from 'nest-commander';

/**
 * Seeds feature flag toggles for the current environment.
 */
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

    private readonly env: EnumAppEnvironment;
    private readonly featureFlags: Prisma.FeatureFlagCreateInput[] = [];
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.featureFlags = MigrationFeatureFlagData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Feature Flags...');
        this.logger.log(
            `Found ${this.featureFlags.length} Feature Flags to seed.`
        );

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    for (const featureFlag of this.featureFlags) {
                        await tx.featureFlag.upsert({
                            where: {
                                key: featureFlag.key,
                            },
                            create: {
                                ...featureFlag,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                            update: {
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                    }
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding feature flags');
            throw error;
        }

        this.logger.log('Feature Flags seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Feature Flags...');

        try {
            await this.databaseService.client.featureFlag.deleteMany({});
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing feature flags');
            throw error;
        }

        this.logger.log('Feature Flags removed successfully.');

        return;
    }
}
