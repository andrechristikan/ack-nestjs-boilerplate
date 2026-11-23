import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationPolicyData } from '@migration/data/migration.policy.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationPolicyData } from '@migration/interfaces/migration.interface';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Prisma } from '@generated/prisma-client/client';
import { RoleRefSelect } from '@modules/role/constants/role.constant';
import type { IRoleRef } from '@modules/role/interfaces/role.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

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
        protected readonly cacheService: CacheService,
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super(cacheService);

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.rolePolicies = MigrationPolicyData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    private async findRoles(): Promise<IRoleRef[]> {
        const roleFilters = this.rolePolicies.map(rolePolicy => ({
            scope: rolePolicy.scope,
            key: rolePolicy.key,
        }));

        return this.databaseService.client.role.findMany({
            where: {
                OR: roleFilters,
            },
            select: RoleRefSelect,
        });
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Policies...');

        const roles = await this.findRoles();

        if (roles.length !== this.rolePolicies.length) {
            this.logger.error('Roles not found for policies, cannot seed.');
            return;
        }

        const existing = await this.databaseService.client.policy.findMany({
            where: { roleId: { in: roles.map(role => role.id) } },
            select: { roleId: true },
            distinct: ['roleId'],
        });
        const seededRoleIds = new Set(existing.map(policy => policy.roleId));

        const rows = this.rolePolicies.flatMap(rolePolicy => {
            const roleId = roles.find(
                role =>
                    role.scope === rolePolicy.scope &&
                    role.key === rolePolicy.key
            )!.id;
            if (seededRoleIds.has(roleId)) {
                return [];
            }

            return rolePolicy.policies.map(policy => ({
                roleId,
                subject: policy.subject,
                action: policy.action,
                conditions: policy.conditions ?? Prisma.DbNull,
                inverted: policy.inverted,
                reason: policy.reason,
            }));
        });

        this.logger.log(`Found ${rows.length} Policies to seed.`);

        const roleIds = [...new Set(rows.map(row => row.roleId))];

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    for (const row of rows) {
                        await tx.policy.create({
                            data: {
                                ...row,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                    }

                    await tx.role.updateMany({
                        where: { id: { in: roleIds } },
                        data: {
                            policyRevision: { increment: 1 },
                            updatedBy: MigrationUserSuperAdminId,
                        },
                    });
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Seeding policies failed');
        }

        this.logger.log('Policies seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Policies...');

        const roles = await this.findRoles();
        const roleIds = roles.map(role => role.id);

        try {
            await this.databaseService.withTransaction(
                async tx => {
                    await tx.policy.deleteMany({
                        where: { roleId: { in: roleIds } },
                    });

                    await tx.role.updateMany({
                        where: { id: { in: roleIds } },
                        data: {
                            policyRevision: { increment: 1 },
                            updatedBy: MigrationUserSuperAdminId,
                        },
                    });
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Removing policies failed');
        }

        this.logger.log('Policies removed successfully.');

        return;
    }
}
