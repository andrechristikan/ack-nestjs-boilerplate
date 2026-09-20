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
    expirePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void>;
    findPendingByHashedToken(
        hashedToken: string
    ): Promise<WorkspaceInvite | null>;
    findByIdAndWorkspace(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite | null>;
    existsPendingByWorkspaceAndEmail(
        workspaceId: string,
        email: string
    ): Promise<boolean>;
    findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
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
    }: IWorkspaceInviteCreateData): Promise<WorkspaceInvite>;
    rotateForResend(
        workspaceInviteId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date
    ): Promise<WorkspaceInvite>;
    revoke(workspaceInviteId: string): Promise<void>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<void>;
}
