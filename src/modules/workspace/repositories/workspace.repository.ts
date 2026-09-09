import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
    Workspace,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    private async createWithSlug(
        ownerId: string,
        { name, description, isPublic }: WorkspaceCreateRequestDto,
        slug: string,
        requestLog: IRequestLog
    ): Promise<Workspace> {
        const workspaceId = this.databaseUtil.createId();

        const [workspace] = await this.databaseService.client.$transaction([
            this.databaseService.client.workspace.create({
                data: {
                    id: workspaceId,
                    name,
                    slug,
                    description,
                    isPublic: isPublic ?? false,
                    createdBy: ownerId,
                    deletedAt: null,
                },
            }),
            this.databaseService.client.workspaceMember.create({
                data: {
                    workspaceId,
                    userId: ownerId,
                    role: EnumWorkspaceMemberRole.owner,
                    createdBy: ownerId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    ownerId,
                    workspaceId,
                    EnumActivityLogAction.workspaceCreated,
                    requestLog
                )
            ),
        ]);

        return workspace;
    }

    async findActiveById(workspaceId: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: {
                id: workspaceId,
                ...WorkspaceActiveFilter,
            },
        });
    }

    async findActivePublicBySlug(slug: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: {
                slug,
                isPublic: true,
                ...WorkspaceActiveFilter,
            },
        });
    }

    async findByIdForAdmin(workspaceId: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findUnique({
            where: { id: workspaceId },
        });
    }

    /** Counts slug holders across ALL rows including soft-deleted ones, matching the unique index, which has no `deletedAt` component. */
    async existsBySlug(
        slug: string,
        excludeWorkspaceId?: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.workspace.count({
            where: {
                slug,
                ...(excludeWorkspaceId
                    ? { id: { not: excludeWorkspaceId } }
                    : {}),
            },
        });

        return count > 0;
    }

    async findWithPaginationCursorByMember(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IPaginationCursorReturn<Workspace>> {
        return this.paginationService.cursor<
            Workspace,
            Prisma.WorkspaceWhereInput
        >(this.databaseService.client.workspace, {
            ...others,
            where: {
                AND: [
                    where ?? {},
                    WorkspaceActiveFilter,
                    { members: { some: { userId } } },
                ],
            },
        });
    }

    async findWithPaginationOffsetForAdmin(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<Workspace>> {
        return this.paginationService.offset<
            Workspace,
            Prisma.WorkspaceWhereInput
        >(this.databaseService.client.workspace, {
            ...others,
            where: {
                ...where,
                ...isPublic,
            },
        });
    }

    async createWithOwner(
        ownerId: string,
        dto: WorkspaceCreateRequestDto,
        slugCandidates: string[],
        requestLog: IRequestLog
    ): Promise<Workspace> {
        for (const slug of slugCandidates) {
            try {
                return await this.createWithSlug(
                    ownerId,
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
        workspaceId: string,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto,
        requestLog: IRequestLog
    ): Promise<Workspace> {
        const [workspace] = await this.databaseService.client.$transaction([
            this.databaseService.client.workspace.update({
                where: { id: workspaceId },
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
                    EnumActivityLogAction.workspaceUpdated,
                    requestLog
                )
            ),
        ]);

        return workspace;
    }

    async updateIsPublic(
        workspaceId: string,
        actorId: string,
        isPublic: boolean,
        requestLog: IRequestLog
    ): Promise<Workspace> {
        const [workspace] = await this.databaseService.client.$transaction([
            this.databaseService.client.workspace.update({
                where: { id: workspaceId },
                data: {
                    isPublic,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.workspaceVisibilityUpdated,
                    requestLog
                )
            ),
        ]);

        return workspace;
    }

    async updateSlug(
        workspaceId: string,
        actorId: string,
        slug: string,
        requestLog: IRequestLog
    ): Promise<Workspace> {
        const [workspace] = await this.databaseService.client.$transaction([
            this.databaseService.client.workspace.update({
                where: { id: workspaceId },
                data: {
                    slug,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.workspaceUpdated,
                    requestLog
                )
            ),
        ]);

        return workspace;
    }

    /** Stamps the workspace `deletedAt` and cascades in one transaction: still-active projects are soft-deleted, pending invites become `expired`, and pending join requests become `cancelled` rather than `rejected`, which would imply a reviewer decision nobody made. */
    async softDelete(
        workspaceId: string,
        actorId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const today = this.helperDateService.create();

        await this.databaseService.client.$transaction([
            this.databaseService.client.workspace.update({
                where: { id: workspaceId },
                data: {
                    deletedAt: today,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.project.updateMany({
                where: {
                    workspaceId,
                    ...ProjectActiveFilter,
                },
                data: {
                    deletedAt: today,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.workspaceInvite.updateMany({
                where: {
                    workspaceId,
                    status: EnumWorkspaceInviteStatus.pending,
                },
                data: {
                    status: EnumWorkspaceInviteStatus.expired,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.workspaceJoinRequest.updateMany({
                where: {
                    workspaceId,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.cancelled,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.workspaceDeleted,
                    requestLog
                )
            ),
        ]);
    }

    async switchForUser(
        userId: string,
        workspaceId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const today = this.helperDateService.create();

        await this.databaseService.client.$transaction([
            this.databaseService.client.user.update({
                where: { id: userId },
                data: {
                    lastWorkspaceId: workspaceId,
                    lastWorkspaceChangedAt: today,
                    updatedBy: userId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    userId,
                    workspaceId,
                    EnumActivityLogAction.workspaceSwitched,
                    requestLog
                )
            ),
        ]);
    }
}
