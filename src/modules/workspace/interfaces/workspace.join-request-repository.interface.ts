import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import type {
    IWorkspaceJoinRequestCreateData,
    IWorkspaceJoinRequestWithEmail,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceJoinRequestRepository {
    expireStalePending(): Promise<number>;
    findByIdAndWorkspace(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<IWorkspaceJoinRequestWithEmail | null>;
    findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        status: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<WorkspaceJoinRequest>>;
    createPendingInTx(
        tx: IDatabaseTransactionClient,
        {
            workspaceId,
            userId,
            message,
            expiredAt,
            nonce,
        }: IWorkspaceJoinRequestCreateData
    ): Promise<WorkspaceJoinRequest>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        reviewedAt: Date
    ): Promise<IWorkspaceJoinRequestWithEmail>;
    rejectInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        reviewedAt: Date
    ): Promise<WorkspaceJoinRequest>;
    cancelPendingByWorkspacesInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        updatedBy: string
    ): Promise<void>;
    cancelPendingByRequesterInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string
    ): Promise<void>;
    cancelPendingByUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number>;
}
