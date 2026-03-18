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
    private readonly SYSTEM_ID = '000000000000000000000001'; // Sentinel system ID for audit trails

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

        try {
            const allMemberEmails = [
                ...new Set(
                    this.tenants.flatMap(t => t.members.map(m => m.userEmail))
                ),
            ];

            const users = allMemberEmails.length > 0
                ? await this.databaseService.user.findMany({
                      where: { email: { in: allMemberEmails } },
                      select: { id: true, email: true },
                  })
                : [];
            for (const tenant of this.tenants) {
                let tenantRecord = await this.databaseService.tenant.findFirst({
                    where: { name: tenant.name },
                });

                if (!tenantRecord) {
                    tenantRecord = await this.databaseService.tenant.create({
                        data: {
                            name: tenant.name,
                            description: tenant.description ?? '',
                            slug: this.createSlug(tenant.name),
                            deletedAt: null,
                            createdBy: this.SYSTEM_ID,
                            updatedBy: this.SYSTEM_ID,
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

                    if (!user) {
                        this.logger.warn(
                            `User ${member.userEmail} not found, skipping member...`
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
                                role: member.tenantRole,
                                status: EnumTenantMemberStatus.active,
                                createdBy: this.SYSTEM_ID,
                                updatedBy: this.SYSTEM_ID,
                                deletedAt: null
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

                    await this.databaseService.user.update({
                        where: { id: user.id, deletedAt: null },
                        data: { lastTenantId: tenantRecord.id, updatedBy: this.SYSTEM_ID },
                        select: { id: true },
                    });
                    this.logger.log(
                        `Updated lastTenantId for ${member.userEmail} to ${tenant.name}`
                    );
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

    private createSlug(value: string): string {
        const normalized = value
            .trim()
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .replace(/_/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');

        return normalized || `tenant-${Date.now()}`;
    }
}
