import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
    Prisma,
    WorkspaceMember,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly activityLogUtil: ActivityLogUtil
    ) {}

    private buildWorkspaceScopedWhere(
        workspaceId: string,
        where?: Prisma.WorkspaceMemberWhereInput,
        role?: Record<string, IPaginationIn>
    ): Prisma.WorkspaceMemberWhereInput {
        return {
            ...where,
            ...(role ?? {}),
            workspaceId,
        };
    }

    async findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId,
            },
        });
    }

    async findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                id: workspaceMemberId,
                workspaceId,
            },
        });
    }

    async countOwnedActiveByUser(userId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: {
                userId,
                role: EnumWorkspaceMemberRole.owner,
                workspace: WorkspaceActiveFilter,
            },
        });
    }

    async countOwners(workspaceId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: {
                workspaceId,
                role: EnumWorkspaceMemberRole.owner,
            },
        });
    }

    async findReviewersByWorkspace(
        workspaceId: string
    ): Promise<{ userId: string }[]> {
        return this.databaseService.client.workspaceMember.findMany({
            where: {
                workspaceId,
                role: {
                    in: [
                        EnumWorkspaceMemberRole.owner,
                        EnumWorkspaceMemberRole.admin,
                    ],
                },
            },
            select: { userId: true },
        });
    }

    async findWithPaginationOffset(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>> {
        return this.paginationService.offset<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: this.buildWorkspaceScopedWhere(workspaceId, where, role),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>> {
        return this.paginationService.cursor<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: this.buildWorkspaceScopedWhere(workspaceId, where, role),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async updateRole(
        workspaceId: string,
        actorId: string,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole,
        requestLog: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceMember.update({
                where: { id: targetMemberId },
                data: {
                    role: newRole,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.workspaceMemberRoleUpdated,
                    requestLog
                )
            ),
        ]);
    }

    async removeMember(
        workspaceId: string,
        actorId: string,
        targetMemberId: string,
        action:
            | typeof EnumActivityLogAction.workspaceMemberRemoved
            | typeof EnumActivityLogAction.workspaceMemberLeft,
        requestLog: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceMember.delete({
                where: { id: targetMemberId },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    action,
                    requestLog
                )
            ),
        ]);
    }

    async transferOwnership(
        workspaceId: string,
        fromMemberId: string,
        toMemberId: string,
        actorId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceMember.update({
                where: { id: fromMemberId },
                data: {
                    role: EnumWorkspaceMemberRole.admin,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.workspaceMember.update({
                where: { id: toMemberId },
                data: {
                    role: EnumWorkspaceMemberRole.owner,
                    updatedBy: actorId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.activityLogUtil.buildCreateArgs(
                    actorId,
                    workspaceId,
                    EnumActivityLogAction.workspaceOwnershipTransferred,
                    requestLog
                )
            ),
        ]);
    }
}
