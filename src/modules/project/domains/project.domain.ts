import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectDomain {
    private readonly slugRegex: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly roleDomain: RoleDomain
    ) {
        this.slugRegex = this.configService.get<RegExp>('project.slugRegex')!;
        this.slugPrefix = this.configService.get<string>('project.slugPrefix')!;
        this.slugMaxLength = this.configService.get<number>(
            'project.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'project.slugMaxAttempts'
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

    private assertSlugAllowed(slug: string): void {
        const isSlugPatternValid = this.slugRegex.test(slug);
        if (slug.length > this.slugMaxLength || !isSlugPatternValid) {
            throw new ProjectSlugInvalidException();
        }
    }

    private async createWithAdminMemberInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorId: string,
        create: IProjectCreate,
        slug: string
    ): Promise<Project> {
        const adminRole = await this.roleDomain.getByScopeAndKeyInTx(
            tx,
            EnumRoleScope.project,
            EnumRoleProjectKey.admin
        );
        if (!adminRole) {
            throw new RoleNotFoundException();
        }

        const project = await this.projectRepository.createInTx(
            tx,
            workspaceId,
            create,
            slug
        );
        await this.projectMemberDomain.createInTx(
            tx,
            project.id,
            actorId,
            adminRole.id,
            actorId
        );

        return project;
    }

    async validateProjectGuard(
        workspaceId: string | null,
        projectId: string | null
    ): Promise<Project> {
        if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        } else if (!projectId) {
            throw new ProjectNotFoundException();
        }

        const project = await this.projectRepository.findActiveByIdAndWorkspace(
            projectId,
            workspaceId
        );
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }

    async getActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null> {
        return this.projectRepository.findActiveByIdAndWorkspace(
            projectId,
            workspaceId
        );
    }

    /** Lists projects in the workspace using the effective access predicate from the HTTP layer. */
    async getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>,
        where?: Prisma.ProjectWhereInput
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectRepository.findWithPaginationCursorForWorkspace(
            workspaceId,
            pagination,
            {
                AND: [
                    { members: { some: { userId: workspaceMember.userId } } },
                    ...(where ? [where] : []),
                ],
            }
        );
    }

    /** Creates the project and adds the creator as its project `admin` member in one transaction, so a new project is never left without a member able to manage it. */
    async createProject(
        workspaceId: string,
        actorId: string,
        create: IProjectCreate
    ): Promise<Project> {
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectCreated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspaceId,
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspaceId,
                metadata: { targetUserId: actorId },
            }),
        ];

        const slugCandidates = this.drawSlugCandidates();
        for (const slug of slugCandidates) {
            let project: Project;
            try {
                project = await this.databaseService.withTransaction(tx =>
                    this.createWithAdminMemberInTx(
                        tx,
                        workspaceId,
                        actorId,
                        create,
                        slug
                    )
                );
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (!isSlugCollision) {
                    throw error;
                }

                continue;
            }

            this.activityLogDomain.stagePrepared(events);

            return project;
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async updateProject(
        project: Project,
        actorId: string,
        update: IProjectUpdate
    ): Promise<Project> {
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];

        const row = await this.projectRepository.updateDetails(
            project.id,
            update
        );

        this.activityLogDomain.stagePrepared(events);

        return row;
    }

    async updateProjectSlug(
        project: Project,
        actorId: string,
        slug: string
    ): Promise<Project> {
        this.assertSlugAllowed(slug);

        const slugTaken = await this.projectRepository.existsBySlugInWorkspace(
            project.workspaceId,
            slug,
            project.id
        );
        if (slugTaken) {
            throw new ProjectSlugAlreadyExistsException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];

        const row = await this.projectRepository.updateSlug(project.id, slug);

        this.activityLogDomain.stagePrepared(events);

        return row;
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.projectDeleted,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];
        const deletedAt = this.helperDateService.create();

        await this.projectRepository.softDelete(project.id, deletedAt);

        this.activityLogDomain.stagePrepared(events);
    }

    async softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void> {
        await this.projectRepository.softDeleteByWorkspaceInTx(
            tx,
            workspaceId,
            deletedAt,
            deletedBy
        );
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string,
        where?: Prisma.ProjectWhereInput
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectRepository.findWithPaginationOffsetForAdmin(
            pagination,
            workspaceId,
            where
        );
    }

    async getByIdForAdmin(projectId: string): Promise<Project> {
        const project =
            await this.projectRepository.findByIdForAdmin(projectId);
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }
}
