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
    existsPendingByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<boolean>;
    findByIdAndWorkspace(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<WorkspaceJoinRequest | null>;
    /** Extra caller-supplied constraint, AND-composed first. */
    findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status: Record<string, IPaginationIn> | undefined,
        additionalWhere: Prisma.WorkspaceJoinRequestWhereInput
    ): Promise<IPaginationCursorReturn<WorkspaceJoinRequest>>;
    createPending({
        workspaceId,
        userId,
        message,
    }: IWorkspaceJoinRequestCreateData): Promise<WorkspaceJoinRequest>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        reviewedAt: Date
    ): Promise<WorkspaceJoinRequest | null>;
    reject(
        workspaceJoinRequestId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        reviewedAt: Date
    ): Promise<WorkspaceJoinRequest | null>;
    cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void>;
}
