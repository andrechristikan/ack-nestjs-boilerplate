import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
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
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceActivityLogUtil } from '@modules/workspace/utils/workspace.activity-log.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceRepository {
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly maxSlugAttempts: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly paginationService: PaginationService,
        private readonly workspaceActivityLogUtil: WorkspaceActivityLogUtil,
        private readonly configService: ConfigService
    ) {
        this.slugPrefix = this.configService.get<string>(
            'workspace.slugPrefix'
        )!;
        this.slugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;
        this.maxSlugAttempts = this.configService.get<number>(
            'workspace.slugMaxAttempts'
        )!;
    }

    private async createWithOwnerAndSlug(
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
                this.workspaceActivityLogUtil.buildCreateArgs(
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
                OR: WorkspaceActiveFilter,
            },
        });
    }

    async findActivePublicBySlug(slug: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: {
                slug,
                isPublic: true,
                OR: WorkspaceActiveFilter,
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
                    { OR: WorkspaceActiveFilter },
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
        requestLog: IRequestLog
    ): Promise<Workspace> {
        if (dto.slug) {
            return this.createWithOwnerAndSlug(
                ownerId,
                dto,
                dto.slug,
                requestLog
            );
        }

        let slug = this.helperStringService.generateSlug(
            this.slugPrefix,
            this.slugMaxLength
        );
        let attemptsLeft = this.maxSlugAttempts;

        while (true) {
            try {
                return await this.createWithOwnerAndSlug(
                    ownerId,
                    dto,
                    slug,
                    requestLog
                );
            } catch (err: unknown) {
                attemptsLeft -= 1;

                const isSlugCollision =
                    err instanceof Prisma.PrismaClientKnownRequestError &&
                    err.code === 'P2002';

                if (!isSlugCollision) {
                    throw err;
                } else if (attemptsLeft <= 0) {
                    throw new DatabaseUniqueValueGenerationFailedException();
                }

                slug = this.helperStringService.generateSlug(
                    this.slugPrefix,
                    this.slugMaxLength
                );
            }
        }
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
                this.workspaceActivityLogUtil.buildCreateArgs(
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
                this.workspaceActivityLogUtil.buildCreateArgs(
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
                this.workspaceActivityLogUtil.buildCreateArgs(
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
                    OR: ProjectActiveFilter,
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
                this.workspaceActivityLogUtil.buildCreateArgs(
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
                this.workspaceActivityLogUtil.buildCreateArgs(
                    userId,
                    workspaceId,
                    EnumActivityLogAction.workspaceSwitched,
                    requestLog
                )
            ),
        ]);
    }
}
