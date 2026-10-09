import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import {
    MigrationUserData,
    MigrationUserSuperAdminId,
} from '@migration/data/migration.user.data';
import type { IMigrationUserData } from '@migration/interfaces/migration.interface';
import type { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nest-commander';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

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
    private readonly seedTransactionTimeoutInMs: number;
    private readonly users: IMigrationUserData[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.users = MigrationUserData[this.env];

        this.slugPrefix = this.configService.get<string>(
            'workspace.slugPrefix'
        )!;
        this.slugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'workspace.slugMaxAttempts'
        )!;
        this.seedTransactionTimeoutInMs = this.configService.get<number>(
            'database.seedTransactionTimeoutInMs'
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

    private async createDefaultWorkspace(user: {
        id: string;
        username: string;
    }): Promise<void> {
        const slugCandidates = this.drawSlugCandidates();

        for (const slug of slugCandidates) {
            try {
                await this.databaseService.withTransaction(
                    async tx => {
                        const workspace = await tx.workspace.create({
                            data: {
                                name: `${user.username}'s Workspace`,
                                slug,
                                createdBy: MigrationUserSuperAdminId,
                                updatedBy: MigrationUserSuperAdminId,
                            },
                        });
                        await this.workspaceMemberRepository.createInTx(
                            tx,
                            workspace.id,
                            user.id,
                            EnumWorkspaceMemberRole.owner,
                            MigrationUserSuperAdminId
                        );
                    },
                    { timeout: this.seedTransactionTimeoutInMs }
                );

                return;
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (!isSlugCollision) {
                    throw new AppUnknownException(
                        error,
                        'Creating the default workspace failed'
                    );
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
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
            this.logger.error(
                'Seeded users not found, cannot seed workspaces.'
            );
            return;
        }

        this.logger.log(
            `Found ${seededUsers.length} Users to seed a default Workspace for.`
        );

        try {
            await Promise.all(
                seededUsers.map(async user => {
                    const ownedCount =
                        await this.workspaceMemberRepository.countOwnedActiveByUser(
                            user.id
                        );
                    if (ownedCount > 0) {
                        return;
                    }

                    await this.createDefaultWorkspace(user);
                })
            );
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Seeding workspaces failed');
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
                                name: `${user.username}'s Workspace`,
                                members: {
                                    some: {
                                        userId: user.id,
                                        role: EnumWorkspaceMemberRole.owner,
                                    },
                                },
                            })
                        ),
                    },
                    select: {
                        id: true,
                    },
                });
            const workspaceIds = seededWorkspaces.map(
                workspace => workspace.id
            );

            if (workspaceIds.length === 0) {
                this.logger.log(
                    'No seeded workspaces found, nothing to remove.'
                );
                return;
            }

            await this.databaseService.withTransaction(
                async tx => {
                    const seededProjects = await tx.project.findMany({
                        where: {
                            workspaceId: {
                                in: workspaceIds,
                            },
                        },
                        select: {
                            id: true,
                        },
                    });
                    const projectIds = seededProjects.map(
                        project => project.id
                    );

                    await tx.projectMember.deleteMany({
                        where: {
                            projectId: {
                                in: projectIds,
                            },
                        },
                    });
                    await tx.workspaceInvite.deleteMany({
                        where: {
                            workspaceId: {
                                in: workspaceIds,
                            },
                        },
                    });
                    await tx.workspaceJoinRequest.deleteMany({
                        where: {
                            workspaceId: {
                                in: workspaceIds,
                            },
                        },
                    });
                    await tx.project.deleteMany({
                        where: {
                            workspaceId: {
                                in: workspaceIds,
                            },
                        },
                    });
                    await tx.activityLog.deleteMany({
                        where: {
                            workspaceId: {
                                in: workspaceIds,
                            },
                        },
                    });
                    await tx.workspaceMember.deleteMany({
                        where: {
                            workspaceId: {
                                in: workspaceIds,
                            },
                        },
                    });
                    await tx.workspace.deleteMany({
                        where: {
                            id: {
                                in: workspaceIds,
                            },
                        },
                    });
                },
                { timeout: this.seedTransactionTimeoutInMs }
            );
        } catch (error: unknown) {
            throw new AppUnknownException(error, 'Removing workspaces failed');
        }

        this.logger.log('Workspaces removed completed.');

        return;
    }
}
