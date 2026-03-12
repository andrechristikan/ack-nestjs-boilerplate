import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import {
    IMigrationTenantData,
    migrationTenantData,
} from '@migration/data/migration.tenant.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumTenantMemberStatus,
    EnumTenantStatus,
} from '@generated/prisma-client';
import { Command } from 'nest-commander';

@Command({
    name: 'tenant',
    description: 'Seed/Remove Tenants',
    allowUnknownOptions: false,
})
export class MigrationTenantSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationTenantSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly tenants: IMigrationTenantData[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.tenants = migrationTenantData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Tenants...');
        this.logger.log(`Found ${this.tenants.length} Tenants to seed.`);

        const allMemberEmails = [
            ...new Set(
                this.tenants.flatMap(t => t.members.map(m => m.userEmail))
            ),
        ];
        const allTenantRoleNames = [
            ...new Set(
                this.tenants.flatMap(t => t.members.map(m => m.tenantRole))
            ),
        ];

        const [users, tenantRoles] = await Promise.all([
            allMemberEmails.length > 0
                ? this.databaseService.user.findMany({
                      where: { email: { in: allMemberEmails } },
                      select: { id: true, email: true },
                  })
                : Promise.resolve([]),
            allTenantRoleNames.length > 0
                ? this.databaseService.role.findMany({
                      where: { name: { in: allTenantRoleNames } },
                      select: { id: true, name: true },
                  })
                : Promise.resolve([]),
        ]);

        try {
            for (const tenant of this.tenants) {
                let tenantRecord = await this.databaseService.tenant.findFirst({
                    where: { name: tenant.name },
                });

                if (!tenantRecord) {
                    tenantRecord = await this.databaseService.tenant.create({
                        data: {
                            name: tenant.name,
                            status: EnumTenantStatus.active,
                            deletedAt: null,
                        },
                    });
                    this.logger.log(`Created tenant: ${tenant.name}`);
                } else {
                    this.logger.log(
                        `Tenant already exists: ${tenant.name}, skipping...`
                    );
                }

                for (const member of tenant.members) {
                    const user = users.find(u => u.email === member.userEmail);
                    const role = tenantRoles.find(
                        r => r.name === member.tenantRole
                    );

                    if (!user) {
                        this.logger.warn(
                            `User ${member.userEmail} not found, skipping member...`
                        );
                        continue;
                    }

                    if (!role) {
                        this.logger.warn(
                            `Tenant role ${member.tenantRole} not found, skipping member...`
                        );
                        continue;
                    }

                    const existingMember =
                        await this.databaseService.tenantMember.findFirst({
                            where: {
                                tenantId: tenantRecord.id,
                                userId: user.id,
                            },
                        });

                    if (!existingMember) {
                        await this.databaseService.tenantMember.create({
                            data: {
                                tenantId: tenantRecord.id,
                                userId: user.id,
                                roleId: role.id,
                                status: EnumTenantMemberStatus.active,
                            },
                        });
                        this.logger.log(
                            `Added member ${member.userEmail} as ${member.tenantRole} to ${tenant.name}`
                        );
                    } else {
                        this.logger.log(
                            `Member ${member.userEmail} already in ${tenant.name}, skipping...`
                        );
                    }
                }
            }
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding tenants');
            throw error;
        }

        this.logger.log('Tenants seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Tenants...');

        try {
            await this.databaseService.$transaction([
                this.databaseService.tenantMember.deleteMany({}),
                this.databaseService.tenant.deleteMany({}),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing tenants');
            throw error;
        }

        this.logger.log('Tenants removed successfully.');

        return;
    }
}
