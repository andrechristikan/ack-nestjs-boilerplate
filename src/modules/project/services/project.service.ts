import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectSlugRegex } from '@modules/project/constants/project.constant';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class ProjectService {
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;
    private readonly chunkSize: number;

    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.slugPrefix = this.configService.get<string>('project.slugPrefix')!;
        this.slugMaxLength = this.configService.get<number>(
            'project.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'project.slugMaxAttempts'
        )!;
        this.chunkSize = this.configService.get<number>(
            'project.delete.chunkSize'
        )!;
    }

    private isSlugAllowed(slug: string): boolean {
        const isPatternValid = ProjectSlugRegex.test(slug);

        return slug.length <= this.slugMaxLength && isPatternValid;
    }

    drawSlugCandidates(): string[] {
        return this.helperStringService.generateSlugCandidates(
            this.slugPrefix,
            this.slugMaxLength,
            this.slugMaxAttempts
        );
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

    async getListCursorByMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<Project>> {
        const hasWorkspaceBypass =
            this.projectUtil.hasWorkspaceBypass(workspaceMember);
        const memberUserId = hasWorkspaceBypass ? null : workspaceMember.userId;

        return this.projectRepository.findWithPaginationCursorForWorkspace(
            workspaceId,
            memberUserId,
            pagination
        );
    }

    async createProjectInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        create: IProjectCreate,
        slug: string
    ): Promise<Project> {
        const actorId = authContext.userId;
        const project = await this.projectRepository.createInTx(
            tx,
            workspaceId,
            create,
            slug
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectCreated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return project;
    }

    async updateProjectInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        update: IProjectUpdate
    ): Promise<Project> {
        const updated = await this.projectRepository.updateDetailsInTx(
            tx,
            project.id,
            update
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectUpdated,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId: project.workspaceId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return updated;
    }

    assertSlugAllowed(slug: string): void {
        const isSlugAllowed = this.isSlugAllowed(slug);
        if (!isSlugAllowed) {
            throw new ProjectSlugInvalidException();
        }
    }

    async updateProjectSlugInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        slug: string
    ): Promise<Project> {
        const updated = await this.projectRepository.updateSlugInTx(
            tx,
            project.id,
            slug
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.projectUpdated,
                userId: authContext.userId,
                createdBy: authContext.userId,
                workspaceId: project.workspaceId,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return updated;
    }

    async softDeleteProjectInTx(
        tx: IDatabaseTransactionClient,
        project: Project,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void> {
        const softDeleted = await this.projectRepository.softDeleteInTx(
            tx,
            project.id,
            deletedAt,
            deletedBy
        );
        if (!softDeleted) {
            throw new ProjectNotFoundException();
        }
    }

    async softDeleteChunkByWorkspace(
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<number> {
        return this.projectRepository.softDeleteChunkByWorkspace(
            workspaceId,
            deletedAt,
            deletedBy,
            this.chunkSize
        );
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        workspaceFilter: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectRepository.findWithPaginationOffsetByAdmin(
            pagination,
            workspaceFilter
        );
    }

    async getByIdByAdmin(projectId: string): Promise<Project> {
        const project = await this.projectRepository.findByIdByAdmin(projectId);
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }
}
