import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    Prisma,
    Project,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    private async createWithSlug(
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto,
        slug: string,
        requestLog: IRequestLog
    ): Promise<Project> {
        const [project] = await this.databaseService.client.$transaction([
            this.databaseService.client.project.create({
                data: {
                    workspaceId,
                    name,
                    slug,
                    description,
                    createdBy: actorId,
                    deletedAt: null,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.projectCreated,
                    requestLog
                )
            ),
        ]);

        return project;
    }

    async findActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null> {
        return this.databaseService.client.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
                ...ProjectActiveFilter,
            },
        });
    }

    async findByIdForAdmin(projectId: string): Promise<Project | null> {
        return this.databaseService.client.project.findUnique({
            where: { id: projectId },
        });
    }

    /** Counts slug holders across ALL rows including soft-deleted ones, matching the unique index, which has no `deletedAt` component. */
    async existsBySlugInWorkspace(
        workspaceId: string,
        slug: string,
        excludeProjectId?: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.project.count({
            where: {
                workspaceId,
                slug,
                ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
            },
        });

        return count > 0;
    }

    async findWithPaginationCursorForWorkspace(
        workspaceId: string,
        memberUserId: string | null,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>> {
        return this.paginationService.cursor<Project, Prisma.ProjectWhereInput>(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    AND: [
                        where ?? {},
                        { workspaceId },
                        ProjectActiveFilter,
                        ...(memberUserId
                            ? [{ members: { some: { userId: memberUserId } } }]
                            : []),
                    ],
                },
            }
        );
    }

    async findWithPaginationOffsetForAdmin(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>> {
        return this.paginationService.offset<Project, Prisma.ProjectWhereInput>(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    ...where,
                    ...(workspaceId ? { workspaceId } : {}),
                },
            }
        );
    }

    async createInWorkspace(
        workspaceId: string,
        actorId: string,
        dto: ProjectCreateRequestDto,
        slugCandidates: string[],
        requestLog: IRequestLog
    ): Promise<Project> {
        for (const slug of slugCandidates) {
            try {
                return await this.createWithSlug(
                    workspaceId,
                    actorId,
                    dto,
                    slug,
                    requestLog
                );
            } catch (error: unknown) {
                if (!this.databaseUtil.isUniqueCollision(error, 'slug')) {
                    throw error;
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async updateDetails(
        projectId: string,
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto,
        requestLog: IRequestLog
    ): Promise<Project> {
        const [project] = await this.databaseService.client.$transaction([
            this.databaseService.client.project.update({
                where: { id: projectId },
                data: {
                    name,
                    description,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.projectUpdated,
                    requestLog
                )
            ),
        ]);

        return project;
    }

    async updateSlug(
        projectId: string,
        workspaceId: string,
        actorId: string,
        slug: string,
        requestLog: IRequestLog
    ): Promise<Project> {
        const [project] = await this.databaseService.client.$transaction([
            this.databaseService.client.project.update({
                where: { id: projectId },
                data: {
                    slug,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.projectUpdated,
                    requestLog
                )
            ),
        ]);

        return project;
    }

    async softDelete(
        projectId: string,
        workspaceId: string,
        actorId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const today = this.helperDateService.create();

        await this.databaseService.client.$transaction([
            this.databaseService.client.project.update({
                where: { id: projectId },
                data: {
                    deletedAt: today,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.projectDeleted,
                    requestLog
                )
            ),
        ]);
    }
}
