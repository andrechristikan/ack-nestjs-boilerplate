import type { Prisma } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class ProjectService {
    private readonly slugRegex: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
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
        return this.helperStringService.generateSlugCandidates(
            this.slugPrefix,
            this.slugMaxLength,
            this.slugMaxAttempts
        );
    }

    private isSlugAllowed(slug: string): boolean {
        const isPatternValid = this.slugRegex.test(slug);

        return slug.length <= this.slugMaxLength && isPatternValid;
    }

    async validateProjectGuard(
        workspaceId: string,
        projectId: string | null
    ): Promise<Project> {
        if (!projectId) {
            throw new RequestContextMissingException('params.projectId');
        }

        const project = await this.projectRepository.findActiveByIdAndWorkspace(
            projectId,
            workspaceId,
            null
        );
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }

    async getScopedByIdAndWorkspace(
        projectId: string,
        workspaceId: string,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<Project> {
        const project = await this.projectRepository.findActiveByIdAndWorkspace(
            projectId,
            workspaceId,
            additionalWhere
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
            workspaceId,
            null
        );
    }

    async getListCursorByMember(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectRepository.findWithPaginationCursorForWorkspace(
            workspaceId,
            pagination,
            additionalWhere
        );
    }

    /** Creates the project and adds the creator's activity entry in one transaction per slug attempt, dispatched after the commit. */
    async createProject(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        create: IProjectCreate
    ): Promise<Project> {
        const actorId = authContext.userId;
        const slugCandidates = this.drawSlugCandidates();

        for (const slug of slugCandidates) {
            try {
                return await this.outboxService.withTransaction(async tx => {
                    const project = await this.projectRepository.createInTx(
                        tx,
                        workspaceId,
                        create,
                        slug
                    );
                    const entry = this.activityLogService.recordEffect(
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
                });
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (!isSlugCollision) {
                    if (error instanceof AppBaseException) {
                        throw error;
                    }

                    throw new AppUnknownException(error);
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    /** Writes the details and adds the actor's activity entry in one transaction, dispatched after the commit. */
    async updateProject(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        update: IProjectUpdate
    ): Promise<Project> {
        return this.outboxService.withTransaction(async tx => {
            const updated = await this.projectRepository.updateDetailsInTx(
                tx,
                project.id,
                update
            );
            const entry = this.activityLogService.recordEffect(
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
        });
    }

    /** Writes the slug and adds the actor's activity entry in one transaction, dispatched after the commit. */
    async updateProjectSlug(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        slug: string
    ): Promise<Project> {
        const isSlugAllowed = this.isSlugAllowed(slug);
        if (!isSlugAllowed) {
            throw new ProjectSlugInvalidException();
        }

        try {
            return await this.outboxService.withTransaction(async tx => {
                const updated = await this.projectRepository.updateSlugInTx(
                    tx,
                    project.id,
                    slug
                );
                const entry = this.activityLogService.recordEffect(
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
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isSlugCollision = this.databaseUtil.isUniqueCollision(
                err,
                'slug'
            );
            if (isSlugCollision) {
                throw new ProjectSlugAlreadyExistsException();
            }

            throw new AppUnknownException(err);
        }
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

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        workspaceFilter: Record<string, IPaginationEqual> | null,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectRepository.findWithPaginationOffsetByAdmin(
            pagination,
            workspaceFilter,
            additionalWhere
        );
    }

    async getByIdByAdmin(
        projectId: string,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<Project> {
        const project = await this.projectRepository.findByIdByAdmin(
            projectId,
            additionalWhere
        );
        if (!project) {
            throw new ProjectNotFoundException();
        }

        return project;
    }
}
