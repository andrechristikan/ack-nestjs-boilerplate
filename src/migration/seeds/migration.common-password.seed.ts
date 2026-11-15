import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { Command } from 'nest-commander';
import { join } from 'path';

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
        private readonly databaseService: DatabaseService,
        private readonly helperArrayService: HelperArrayService,
        private readonly configService: ConfigService
    ) {
        super();

        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
        this.seedBatchSize = this.configService.get<number>(
            'database.seedBatchSize'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Common Passwords...');

        const values = JSON.parse(
            readFileSync(
                join(
                    import.meta.dirname,
                    '../data/migration.common-password.data.json'
                )
            ).toString()
        ) as string[];
        const batches = this.helperArrayService.chunk(
            values,
            this.seedBatchSize
        );
        this.logger.log(`Found ${values.length} Common Passwords to seed.`);

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    for (const batch of batches) {
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
                            continue;
                        }

                        await tx.commonPassword.createMany({
                            data: missing.map(value => ({
                                value,
                                createdBy: MigrationUserSuperAdminId,
                            })),
                        });
                    }
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
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
