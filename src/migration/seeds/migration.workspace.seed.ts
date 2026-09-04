import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { faker } from '@faker-js/faker';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationUserData } from '@migration/data/migration.user.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Prisma, UserAgent } from '@generated/prisma-client';
import { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';
import { UAParser } from 'ua-parser-js';

/**
 * Seeds one default personal workspace (owner membership, no project) per seeded user. Requires users to already be seeded, and aborts otherwise.
 */
@Command({
    name: 'workspace',
    description: 'Seed/Remove Default Workspaces',
    allowUnknownOptions: false,
})
export class MigrationWorkspaceSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationWorkspaceSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;
    private readonly users: {
        country: string;
        email: string;
        name: string;
        role: string;
        password: string;
    }[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.users = migrationUserData[this.env];

        this.slugPrefix = this.configService.get<string>(
            'workspace.slugPrefix'
        )!;
        this.slugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'workspace.slugMaxAttempts'
        )!;
    }

    private drawSlugCandidates(): string[] {
        return Array.from({ length: this.slugMaxAttempts }, () =>
            this.helperStringService.generateSlug(
                this.slugPrefix,
                this.slugMaxLength
            )
        );
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Workspaces...');

        const emails = this.users.map(user => user.email.toLowerCase());
        const seededUsers = await this.databaseService.client.user.findMany({
            where: {
                email: {
                    in: emails,
                },
            },
            select: {
                id: true,
                username: true,
            },
        });

        if (seededUsers.length !== emails.length) {
            this.logger.warn('Seeded users not found, cannot seed workspaces.');
            return;
        }

        this.logger.log(
            `Found ${seededUsers.length} Users to seed a default Workspace for.`
        );

        try {
            const userAgent = UAParser(faker.internet.userAgent()) as UserAgent;
            const ipAddress = faker.internet.ip();

            await Promise.all(
                seededUsers.map(async user => {
                    const ownedCount =
                        await this.workspaceMemberRepository.countOwnedActiveByUser(
                            user.id
                        );
                    if (ownedCount > 0) {
                        return;
                    }

                    const dto = new WorkspaceCreateRequestDto();
                    dto.name = `${user.username}'s Workspace`;

                    await this.workspaceRepository.createWithOwner(
                        user.id,
                        dto,
                        this.drawSlugCandidates(),
                        { userAgent, ipAddress }
                    );
                })
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding workspaces');
            throw error;
        }

        this.logger.log('Workspaces seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Workspaces...');

        try {
            const emails = this.users.map(user => user.email.toLowerCase());
            const seededUsers = await this.databaseService.client.user.findMany(
                {
                    where: {
                        email: {
                            in: emails,
                        },
                    },
                    select: {
                        id: true,
                        username: true,
                    },
                }
            );

            if (seededUsers.length === 0) {
                this.logger.log('No seeded users found, nothing to remove.');
                return;
            }

            const seededWorkspaces =
                await this.databaseService.client.workspace.findMany({
                    where: {
                        OR: seededUsers.map<Prisma.WorkspaceWhereInput>(
                            user => ({
                                createdBy: user.id,
                                name: `${user.username}'s Workspace`,
                            })
                        ),
                    },
                    select: {
                        id: true,
                    },
                });
            const workspaceIds = seededWorkspaces.map(workspace => workspace.id);

            if (workspaceIds.length === 0) {
                this.logger.log('No seeded workspaces found, nothing to remove.');
                return;
            }

            await this.databaseService.client.$transaction([
                this.databaseService.client.activityLog.deleteMany({
                    where: {
                        workspaceId: {
                            in: workspaceIds,
                        },
                    },
                }),
                this.databaseService.client.workspaceMember.deleteMany({
                    where: {
                        workspaceId: {
                            in: workspaceIds,
                        },
                    },
                }),
                this.databaseService.client.workspace.deleteMany({
                    where: {
                        id: {
                            in: workspaceIds,
                        },
                    },
                }),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing workspaces');
            throw error;
        }

        this.logger.log('Workspaces removed completed.');

        return;
    }
}
