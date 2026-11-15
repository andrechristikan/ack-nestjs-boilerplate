import { EnumAppEnvironment } from '@app/enums/app.enum';
import { CacheService } from '@common/cache/services/cache.service';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { MigrationRoleData } from '@migration/data/migration.role.data';
import { MigrationUserSuperAdminId } from '@migration/data/migration.user.data';
import type { IMigrationRoleData } from '@migration/interfaces/migration.interface';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { RoleCache } from '@modules/role/caches/role.cache';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

@Command({
    name: 'role',
    description: 'Seed/Remove Roles',
    allowUnknownOptions: false,
})
export class MigrationRoleSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationRoleSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly roles: IMigrationRoleData[] = [];
    private readonly seedTransactionTimeoutInMs: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly roleCache: RoleCache,
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.roles = MigrationRoleData[this.env];
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
        )!;
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Roles...');
        this.logger.log(`Found ${this.roles.length} Roles to seed.`);

        try {
            const roleIds = await this.databaseService.withTransaction(
                async tx => {
                    const ids: string[] = [];
                    for (const role of this.roles) {
                        const seeded = await tx.role.upsert({
                            where: {
                                name: role.name.toLowerCase(),
                            },
                            create: {
                                name: role.name.toLowerCase(),
                                description: role.description,
                                type: role.type,
                                isImmutable: role.isImmutable,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                            update: {
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                        ids.push(seeded.id);
                    }

                    return ids;
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );

            const keys = roleIds.flatMap(roleId =>
                this.roleCache.buildRoleKeys(roleId)
            );
            await this.cacheService.invalidate(keys);
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Seeding roles failed');
        }

        this.logger.log('Roles seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Roles...');

        try {
            // Sequential by design: write must not run if an earlier step throws
            const roles = await this.databaseService.client.role.findMany({
                select: { id: true },
            });
            await this.databaseService.client.role.deleteMany({});

            const keys = roles.flatMap(role =>
                this.roleCache.buildRoleKeys(role.id)
            );
            await this.cacheService.invalidate(keys);
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Removing roles failed');
        }

        this.logger.log('Roles removed successfully.');

        return;
    }
}
