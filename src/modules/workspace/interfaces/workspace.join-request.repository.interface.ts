import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    EnumWorkspaceJoinRejectReason,
    Prisma,
    WorkspaceJoinRequest,
} from '@generated/prisma-client';
import { IWorkspaceJoinRequestCreateData } from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceJoinRequestRepository {
    existsPendingByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<boolean>;
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
        status?: Record<string, IPaginationIn>
    ): Promise<IPaginationCursorReturn<WorkspaceJoinRequest>>;
    createPendingInTx(
        tx: IDatabaseTransactionClient,
        { workspaceId, userId, message }: IWorkspaceJoinRequestCreateData
    ): Promise<WorkspaceJoinRequest>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        reviewedAt: Date
    ): Promise<void>;
    rejectInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        reviewedAt: Date
    ): Promise<void>;
    cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorId: string
    ): Promise<void>;
}
