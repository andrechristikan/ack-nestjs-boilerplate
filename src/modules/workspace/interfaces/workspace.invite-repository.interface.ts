import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import type {
    IWorkspaceInviteCreateData,
    IWorkspaceInviteList,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceInviteRepository {
    expireStalePending(): Promise<number>;
    revokePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void>;
    revokePendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        email: string
    ): Promise<void>;
    revokeAllPendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        email: string
    ): Promise<void>;
    clearProjectInTx(
        tx: IDatabaseTransactionClient,
        projectId: string
    ): Promise<void>;
    findPendingByHashedToken(
        hashedToken: string
    ): Promise<WorkspaceInvite | null>;
    findByIdAndWorkspace(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite | null>;
    findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<IWorkspaceInviteList>>;
    createPending({
        workspaceInviteId,
        workspaceId,
        email,
        workspaceRole,
        projectId,
        projectRole,
        hashedToken,
        reference,
        expiredAt,
        invitedByUserId,
        nonce,
    }: IWorkspaceInviteCreateData): Promise<WorkspaceInvite>;
    rotateForResend(
        workspaceInviteId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date,
        resentAt: Date
    ): Promise<WorkspaceInvite | null>;
    revoke(workspaceInviteId: string): Promise<boolean>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<boolean>;
}
