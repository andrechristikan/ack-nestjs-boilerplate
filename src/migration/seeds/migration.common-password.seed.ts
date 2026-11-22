import { CacheService } from '@common/cache/services/cache.service';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationCommonPasswordData } from '@migration/data/migration.common-password.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

@Command({
    name: 'commonPassword',
    description: 'Seed/Remove Common Passwords',
    allowUnknownOptions: false,
})
export class MigrationCommonPasswordSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationCommonPasswordSeed.name);

    private readonly seedTransactionTimeoutInMs: number;
    private readonly seedBatchSize: number;

    constructor(
        protected readonly cacheService: CacheService,
        private readonly databaseService: DatabaseService,
        private readonly helperArrayService: HelperArrayService,
        private readonly configService: ConfigService
    ) {
        super(cacheService);

        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
        this.seedBatchSize = this.configService.get<number>(
            'database.seedBatchSize'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Common Passwords...');

        const values = MigrationCommonPasswordData;
        const batches = this.helperArrayService.chunk(
            values,
            this.seedBatchSize
        );
        this.logger.log(`Found ${values.length} Common Passwords to seed.`);

        try {
            // Sequential by design: fan-out over an unbounded collection
            for (const batch of batches) {
                await this.databaseService.withTransaction(
                    async tx => {
                        const existing = await tx.commonPassword.findMany({
                            where: { value: { in: batch } },
                            select: { value: true },
                        });
                        const present = new Set(
                            existing.map(({ value }) => value)
                        );
                        const missing = batch.filter(
                            value => !present.has(value)
                        );
                        if (missing.length === 0) {
                            return;
                        }

                        await tx.commonPassword.createMany({
                            data: missing.map(value => ({
                                value,
                                createdBy: MigrationUserSuperAdminId,
                            })),
                        });
                    },
                    { timeout: this.seedTransactionTimeoutInMs }
                );
            }
        } catch (error: unknown) {
            throw new AppUnknownException(
                error,
                'Seeding common passwords failed'
            );
        }

        this.logger.log('Common Passwords seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing Common Passwords...');

        try {
            await this.databaseService.client.commonPassword.deleteMany({
                where: {},
            });
        } catch (error: unknown) {
            throw new AppUnknownException(
                error,
                'Removing common passwords failed'
            );
        }

        this.logger.log('Common Passwords removed successfully.');

        return;
    }
}
