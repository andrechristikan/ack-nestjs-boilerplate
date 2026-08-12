import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
    WorkspaceJoinRequest,
} from '@generated/prisma-client';
import { IWorkspaceJoinRequestRequester } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceActivityLogUtil } from '@modules/workspace/utils/workspace.activity-log.util';
import { Injectable } from '@nestjs/common';

export interface IWorkspaceJoinRequestCreateData {
    workspaceId: string;
    userId: string;
    message?: string;
}

@Injectable()
export class WorkspaceJoinRequestRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly paginationService: PaginationService,
        private readonly workspaceActivityLogUtil: WorkspaceActivityLogUtil
    ) {}

    async existsPendingByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<boolean> {
        const count =
            await this.databaseService.client.workspaceJoinRequest.count({
                where: {
                    workspaceId,
                    userId,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                },
            });

        return count > 0;
    }

    async findByIdAndWorkspace(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<WorkspaceJoinRequest | null> {
        return this.databaseService.client.workspaceJoinRequest.findFirst({
            where: {
                id: workspaceJoinRequestId,
                workspaceId,
            },
        });
    }

    async findRequesterNameById(
        userId: string
    ): Promise<IWorkspaceJoinRequestRequester | null> {
        return this.databaseService.client.user.findUnique({
            where: { id: userId },
            select: { name: true, username: true },
        });
    }

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IPaginationCursorReturn<WorkspaceJoinRequest>> {
        return this.paginationService.cursor<
            WorkspaceJoinRequest,
            Prisma.WorkspaceJoinRequestWhereInput
        >(this.databaseService.client.workspaceJoinRequest, {
            ...others,
            where: {
                ...where,
                ...(status ?? {}),
                workspaceId,
            },
        });
    }

    async createPending(
        { workspaceId, userId, message }: IWorkspaceJoinRequestCreateData,
        requestLog: IRequestLog
    ): Promise<WorkspaceJoinRequest> {
        const [joinRequest] = await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceJoinRequest.create({
                data: {
                    workspaceId,
                    userId,
                    message,
                    createdBy: userId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.workspaceActivityLogUtil.buildCreateArgs(
                    userId,
                    workspaceId,
                    EnumActivityLogAction.workspaceJoinRequested,
                    requestLog
                )
            ),
        ]);

        return joinRequest;
    }

    async acceptForRequester(
        joinRequest: WorkspaceJoinRequest,
        reviewerId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const today = this.helperService.dateCreate();

        await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceMember.create({
                data: {
                    workspaceId: joinRequest.workspaceId,
                    userId: joinRequest.userId,
                    role: EnumWorkspaceMemberRole.member,
                    createdBy: reviewerId,
                },
            }),
            this.databaseService.client.workspaceJoinRequest.update({
                where: { id: joinRequest.id },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                    reviewedByUserId: reviewerId,
                    reviewedAt: today,
                    updatedBy: reviewerId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.workspaceActivityLogUtil.buildCreateArgs(
                    reviewerId,
                    joinRequest.workspaceId,
                    EnumActivityLogAction.workspaceJoinAccepted,
                    requestLog
                )
            ),
        ]);
    }

    async rejectForRequester(
        workspaceJoinRequestId: string,
        workspaceId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        requestLog: IRequestLog
    ): Promise<void> {
        const today = this.helperService.dateCreate();

        await this.databaseService.client.$transaction([
            this.databaseService.client.workspaceJoinRequest.update({
                where: { id: workspaceJoinRequestId },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.rejected,
                    rejectReasonCode,
                    reviewedByUserId: reviewerId,
                    reviewedAt: today,
                    updatedBy: reviewerId,
                },
            }),
            this.databaseService.client.activityLog.create(
                this.workspaceActivityLogUtil.buildCreateArgs(
                    reviewerId,
                    workspaceId,
                    EnumActivityLogAction.workspaceJoinRejected,
                    requestLog
                )
            ),
        ]);
    }
}
