import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationRoleData } from '@migration/data/migration.role.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Prisma } from '@generated/prisma-client';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';

/**
 * Seeds the superadmin, admin, and user roles. The policy rows each role grants are seeded by
 * `MigrationPolicySeed`, which runs after this one.
 */
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
    private readonly roles: Prisma.RoleCreateInput[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.roles = migrationRoleData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Roles...');
        this.logger.log(`Found ${this.roles.length} Roles to seed.`);

        try {
            await this.databaseService.client.$transaction(
                this.roles.map(role =>
                    this.databaseService.client.role.upsert({
                        where: {
                            name: role.name.toLowerCase(),
                        },
                        create: {
                            name: role.name.toLowerCase(),
                            description: role.description,
                            type: role.type,
                        },
                        update: {},
                    })
                )
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding roles');
            throw error;
        }

        this.logger.log('Roles seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Roles...');

        try {
            await this.databaseService.client.role.deleteMany({});
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing roles');
            throw error;
        }

        this.logger.log('Roles removed successfully.');

        return;
    }
}
