import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationTermPolicyData } from '@migration/data/migration.term-policy.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTermPolicyStatus } from '@generated/prisma-client/client';
import { Command } from 'nest-commander';

/**
 * Seeds published term policy records (without document contents) for the current environment.
 */
@Command({
    name: 'termPolicy',
    description: 'Seed/Remove Term Policies',
    allowUnknownOptions: false,
})
export class MigrationTermPolicySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationTermPolicySeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly termPolicies: TermPolicyCreateRequestDto[] = [];
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.termPolicies = MigrationTermPolicyData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding TermPolicies...');
        this.logger.log(
            `Found ${this.termPolicies.length} TermPolicies to seed.`
        );

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    for (const { contents: _contents, ...termPolicy } of this
                        .termPolicies) {
                        await tx.termPolicy.upsert({
                            where: {
                                type_version: {
                                    type: termPolicy.type,
                                    version: termPolicy.version,
                                },
                            },
                            create: {
                                ...termPolicy,
                                status: EnumTermPolicyStatus.published,
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
            this.logger.error(error, 'Error seeding term policies');
            throw error;
        }

        this.logger.log('TermPolicies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back TermPolicies...');

        await this.databaseService.client.termPolicy.deleteMany({});

        this.logger.log('TermPolicies removed successfully.');

        return;
    }
}
