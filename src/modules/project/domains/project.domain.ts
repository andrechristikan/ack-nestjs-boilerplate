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
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
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
        private readonly projectUtil: ProjectUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
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
        if (slug.length > this.slugMaxLength || !this.slugRegex.test(slug)) {
            throw new ProjectSlugInvalidException();
        }
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

    /** Lists projects in the workspace: a workspace `owner` sees every project, everyone else sees only the ones they hold a `ProjectMember` row for. */
    async getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>> {
        const memberUserId = this.projectUtil.isWorkspaceOwner(workspaceMember)
            ? null
            : workspaceMember.userId;

        return this.projectRepository.findWithPaginationCursorForWorkspace(
            workspaceId,
            memberUserId,
            pagination
        );
    }

    async createProject(
        workspaceId: string,
        actorId: string,
        create: IProjectCreate
    ): Promise<Project> {
        const slugCandidates = this.drawSlugCandidates();

        for (const slug of slugCandidates) {
            try {
                return await this.databaseService.withTransaction(async tx => {
                    const project = await this.projectRepository.createInTx(
                        tx,
                        workspaceId,
                        create,
                        slug
                    );
                    this.activityLogDomain.stage({
                        action: EnumActivityLogAction.projectCreated,
                        userId: actorId,
                        createdBy: actorId,
                        workspaceId: workspaceId,
                    });

                    return project;
                });
            } catch (error: unknown) {
                if (!this.databaseUtil.isUniqueCollision(error, 'slug')) {
                    throw error;
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    getProject(project: Project): Project {
        return project;
    }

    async updateProject(
        project: Project,
        actorId: string,
        update: IProjectUpdate
    ): Promise<Project> {
        return this.databaseService.withTransaction(async tx => {
            const row = await this.projectRepository.updateDetailsInTx(
                tx,
                project.id,
                update
            );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.projectUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            });

            return row;
        });
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

        return this.databaseService.withTransaction(async tx => {
            const row = await this.projectRepository.updateSlugInTx(
                tx,
                project.id,
                slug
            );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.projectUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            });

            return row;
        });
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        const deletedAt = this.helperDateService.create();

        await this.databaseService.withTransaction(async tx => {
            await this.projectRepository.softDeleteInTx(
                tx,
                project.id,
                deletedAt
            );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.projectDeleted,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            });
        });
    }

    async softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date
    ): Promise<void> {
        await this.projectRepository.softDeleteByWorkspaceInTx(
            tx,
            workspaceId,
            deletedAt
        );
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>> {
        return this.projectRepository.findWithPaginationOffsetForAdmin(
            pagination,
            workspaceId
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
