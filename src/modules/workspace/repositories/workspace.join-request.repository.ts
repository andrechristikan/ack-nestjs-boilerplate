import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import type { IWorkspaceJoinRequestRepository } from '@modules/workspace/interfaces/workspace.join-request-repository.interface';
import type { IWorkspaceJoinRequestCreateData } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestRepository implements IWorkspaceJoinRequestRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
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

    async createPending({
        workspaceId,
        userId,
        message,
    }: IWorkspaceJoinRequestCreateData): Promise<WorkspaceJoinRequest> {
        return this.databaseService.client.workspaceJoinRequest.create({
            data: {
                workspaceId,
                userId,
                message,
            },
        });
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        reviewedAt: Date
    ): Promise<void> {
        await tx.workspaceJoinRequest.update({
            where: { id: workspaceJoinRequestId },
            data: {
                status: EnumWorkspaceJoinRequestStatus.accepted,
                reviewedByUserId: reviewerId,
                reviewedAt,
            },
        });
    }

    async reject(
        workspaceJoinRequestId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        reviewedAt: Date
    ): Promise<void> {
        await this.databaseService.client.workspaceJoinRequest.update({
            where: { id: workspaceJoinRequestId },
            data: {
                status: EnumWorkspaceJoinRequestStatus.rejected,
                rejectReasonCode,
                reviewedByUserId: reviewerId,
                reviewedAt,
            },
        });
    }

    async cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        await tx.workspaceJoinRequest.updateMany({
            where: {
                workspaceId,
                status: EnumWorkspaceJoinRequestStatus.pending,
            },
            data: {
                status: EnumWorkspaceJoinRequestStatus.cancelled,
            },
        });
    }
}
