import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import type {
    IWorkspaceInviteCreateData,
    IWorkspaceInviteList,
    IWorkspaceInvitePreview,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceInviteRepository {
    expireStalePending(): Promise<number>;
    revokePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        updatedBy: string
    ): Promise<void>;
    revokePendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        email: string
    ): Promise<void>;
    revokeAllPendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        email: string,
        updatedBy: string
    ): Promise<void>;
    clearProjectInTx(
        tx: IDatabaseTransactionClient,
        projectId: string
    ): Promise<void>;
    findPendingByHashedToken(
        hashedToken: string
    ): Promise<IWorkspaceInvitePreview | null>;
    findByIdAndWorkspace(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite | null>;
    findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        status: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<IWorkspaceInviteList>>;
    createPendingInTx(
        tx: IDatabaseTransactionClient,
        {
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
        }: IWorkspaceInviteCreateData
    ): Promise<WorkspaceInvite>;
    rotateForResendInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date,
        resentAt: Date
    ): Promise<WorkspaceInvite | null>;
    revokeInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string
    ): Promise<boolean>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<boolean>;
}
