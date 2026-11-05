import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    EnumWorkspaceJoinRejectReason,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import type { IWorkspaceJoinRequestCreateData } from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceJoinRequestRepository {
    expireStalePending(): Promise<number>;
    findByIdAndWorkspace(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<WorkspaceJoinRequest | null>;
    findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<WorkspaceJoinRequest>>;
    createPending({
        workspaceId,
        userId,
        message,
        expiredAt,
        nonce,
    }: IWorkspaceJoinRequestCreateData): Promise<WorkspaceJoinRequest>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        reviewedAt: Date
    ): Promise<boolean>;
    reject(
        workspaceJoinRequestId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        reviewedAt: Date
    ): Promise<boolean>;
    cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void>;
    cancelPendingByRequesterInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void>;
    cancelPendingByUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number>;
}
