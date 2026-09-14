import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { Prisma, WorkspaceInvite } from '@generated/prisma-client';
import { IWorkspaceInviteCreateData } from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceInviteRepository {
    expireStalePending(): Promise<number>;
    expirePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorId: string
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
    ): Promise<IPaginationCursorReturn<WorkspaceInvite>>;
    createPendingInTx(
        tx: IDatabaseTransactionClient,
        {
            workspaceId,
            email,
            workspaceRole,
            projectId,
            projectRole,
            hashedToken,
            reference,
            expiredAt,
            invitedByUserId,
        }: IWorkspaceInviteCreateData
    ): Promise<WorkspaceInvite>;
    rotateForResend(
        workspaceInviteId: string,
        actorId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date
    ): Promise<WorkspaceInvite>;
    revokeInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        actorId: string
    ): Promise<void>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<void>;
}
