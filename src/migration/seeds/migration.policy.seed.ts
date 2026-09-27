import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationPolicyData } from '@migration/data/migration.policy.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationPolicyData } from '@migration/interfaces/migration.interface';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { EnumRoleScope } from '@generated/prisma-client/client';
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
    private readonly rolePolicies: IMigrationPolicyData[] = [];
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

        const roles = await this.findRoles();

        if (roles.length !== this.rolePolicies.length) {
            this.logger.error('Roles not found for policies, cannot seed.');
            return;
        }

        const rows = this.rolePolicies.flatMap(rolePolicy =>
            rolePolicy.policies.map(policy => ({
                roleId: roles.find(
                    role =>
                        role.scope === rolePolicy.scope &&
                        role.key === rolePolicy.key
                )!.id,
                subject: policy.subject,
                action: policy.action,
                conditions: policy.conditions ?? Prisma.DbNull,
                inverted: policy.inverted,
                reason: policy.reason,
            }))
        );

        this.logger.log(`Found ${rows.length} Policies to seed.`);

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    await tx.policy.deleteMany({
                        where: { roleId: { in: roles.map(role => role.id) } },
                    });

                    for (const row of rows) {
                        await tx.policy.create({
                            data: {
                                ...row,
                                createdBy: MigrationUserSuperAdminId,
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

        const roles = await this.findRoles();

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

    private findRoles(): Promise<
        { id: string; scope: EnumRoleScope; key: string }[]
    > {
        const roleFilters = this.rolePolicies.map(rolePolicy => ({
            scope: rolePolicy.scope,
            key: rolePolicy.key,
        }));

        return this.databaseService.client.role.findMany({
            where: {
                OR: roleFilters,
            },
            select: {
                id: true,
                scope: true,
                key: true,
            },
        });
    }
}
