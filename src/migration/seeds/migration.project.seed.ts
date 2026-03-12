import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import {
    IMigrationProjectData,
    migrationProjectData,
} from '@migration/data/migration.project.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumProjectMemberStatus,
    EnumProjectStatus,
} from '@generated/prisma-client';
import { Command } from 'nest-commander';

@Command({
    name: 'project',
    description: 'Seed/Remove Projects',
    allowUnknownOptions: false,
})
export class MigrationProjectSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationProjectSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly projects: IMigrationProjectData[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.projects = migrationProjectData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Projects...');
        this.logger.log(`Found ${this.projects.length} Projects to seed.`);

        // Collect unique lookup keys in one pass
        const emails = new Set<string>();
        const roleNames = new Set<string>();
        const tenantNames = new Set<string>();

        for (const p of this.projects) {
            tenantNames.add(p.tenantName);
            if (p.ownerUserEmail) {
                emails.add(p.ownerUserEmail);
            }
            for (const m of p.members) {
                emails.add(m.userEmail);
                roleNames.add(m.projectRole);
            }
        }

        // Fetch dependencies
        const [userRows, roleRows, tenantRows] = await Promise.all([
            this.databaseService.user.findMany({
                where: { email: { in: [...emails] } },
                select: { id: true, email: true },
            }),
            this.databaseService.role.findMany({
                where: { name: { in: [...roleNames] } },
                select: { id: true, name: true },
            }),
            this.databaseService.tenant.findMany({
                where: { name: { in: [...tenantNames] } },
                select: { id: true, name: true },
            }),
        ]);

        // Build lookup Maps for O(1) access
        const userByEmail = new Map(userRows.map(u => [u.email, u]));
        const roleByName = new Map(roleRows.map(r => [r.name, r]));
        const tenantByName = new Map(tenantRows.map(t => [t.name, t]));

        try {
            for (const project of this.projects) {
                const tenant = tenantByName.get(project.tenantName);

                if (!tenant) {
                    this.logger.warn(
                        `Tenant ${project.tenantName} not found, skipping project ${project.name}...`
                    );
                    continue;
                }

                const ownerUser = project.ownerUserEmail
                    ? userByEmail.get(project.ownerUserEmail)
                    : undefined;

                if (project.ownerUserEmail && !ownerUser) {
                    this.logger.warn(
                        `Owner user ${project.ownerUserEmail} not found for project ${project.name}, creating without owner...`
                    );
                }

                let projectRecord =
                    await this.databaseService.project.findFirst({
                        where: {
                            tenantId: tenant.id,
                            name: project.name,
                        },
                    });

                if (!projectRecord) {
                    projectRecord = await this.databaseService.project.create({
                        data: {
                            tenantId: tenant.id,
                            ownerUserId: ownerUser?.id ?? null,
                            name: project.name,
                            status: EnumProjectStatus.active,
                            deletedAt: null,
                        },
                    });
                    this.logger.log(
                        `Created project: ${project.name} (tenant: ${tenant.name})`
                    );
                } else {
                    this.logger.log(
                        `Project already exists: ${project.name} (tenant: ${tenant.name}), skipping create...`
                    );
                }

                for (const member of project.members) {
                    const user = userByEmail.get(member.userEmail);
                    const role = roleByName.get(member.projectRole);

                    if (!user) {
                        this.logger.warn(
                            `User ${member.userEmail} not found, skipping project member...`
                        );
                        continue;
                    }

                    if (!role) {
                        this.logger.warn(
                            `Project role ${member.projectRole} not found, skipping project member...`
                        );
                        continue;
                    }

                    const existingMember =
                        await this.databaseService.projectMember.findFirst({
                            where: {
                                projectId: projectRecord.id,
                                userId: user.id,
                            },
                        });

                    if (!existingMember) {
                        await this.databaseService.projectMember.create({
                            data: {
                                projectId: projectRecord.id,
                                userId: user.id,
                                roleId: role.id,
                                status: EnumProjectMemberStatus.active,
                            },
                        });
                        this.logger.log(
                            `Added member ${member.userEmail} as ${member.projectRole} to ${project.name}`
                        );
                    } else {
                        this.logger.log(
                            `Member ${member.userEmail} already in ${project.name}, skipping...`
                        );
                    }
                }
            }
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding projects');
            throw error;
        }

        this.logger.log('Projects seeded successfully.');
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Projects...');

        try {
            await this.databaseService.$transaction([
                this.databaseService.projectMember.deleteMany({}),
                this.databaseService.project.deleteMany({}),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing projects');
            throw error;
        }

        this.logger.log('Projects removed successfully.');

        return;
    }
}
