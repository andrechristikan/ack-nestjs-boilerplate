import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationPolicyData } from '@migration/data/migration.policy.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

/**
 * Seeds the policy rows each seeded role grants. Requires roles to already be seeded, and
 * aborts otherwise.
 */
@Command({
    name: 'policy',
    description: 'Seed/Remove Policies',
    allowUnknownOptions: false,
})
export class MigrationPolicySeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationPolicySeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly rolePolicies: {
        role: string;
        policies: PolicyRequestDto[];
    }[] = [];
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.rolePolicies = MigrationPolicyData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Policies...');

        const roleNames = this.rolePolicies.map(rolePolicy => rolePolicy.role);
        const roles = await this.databaseService.client.role.findMany({
            where: {
                name: {
                    in: roleNames,
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (roles.length !== roleNames.length) {
            this.logger.error('Roles not found for policies, cannot seed.');
            return;
        }

        const rows = this.rolePolicies.flatMap(rolePolicy =>
            rolePolicy.policies.map(policy => ({
                roleId: roles.find(role => role.name === rolePolicy.role)!.id,
                subject: policy.subject,
                action: policy.action,
            }))
        );

        this.logger.log(`Found ${rows.length} Policies to seed.`);

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    for (const row of rows) {
                        await tx.policy.upsert({
                            where: {
                                roleId_subject: {
                                    roleId: row.roleId,
                                    subject: row.subject,
                                },
                            },
                            create: {
                                ...row,
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
            this.logger.error(error, 'Error seeding policies');
            throw error;
        }

        this.logger.log('Policies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Policies...');

        const roleNames = this.rolePolicies.map(rolePolicy => rolePolicy.role);
        const roles = await this.databaseService.client.role.findMany({
            where: {
                name: {
                    in: roleNames,
                },
            },
            select: {
                id: true,
            },
        });

        try {
            await this.databaseService.client.policy.deleteMany({
                where: {
                    roleId: {
                        in: roles.map(role => role.id),
                    },
                },
            });
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing policies');
            throw error;
        }

        this.logger.log('Policies removed successfully.');

        return;
    }
}
