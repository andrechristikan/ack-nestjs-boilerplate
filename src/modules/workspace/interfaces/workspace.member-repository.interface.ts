import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithEmail,
    IWorkspaceOwnedUser,
    IWorkspaceTransferMember,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceMemberRepository {
    findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null>;
    findOneByWorkspaceAndUserWithUser(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceTransferMember | null>;
    existsActiveByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<boolean>;
    findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string
    ): Promise<IWorkspaceMemberWithEmail | null>;
    findLiveOwnedWorkspaceIdsByUser(userId: string): Promise<string[]>;
    countOwnedActiveByUser(userId: string): Promise<number>;
    findWithPaginationOffset(
        workspaceId: string,
        { where, ...others }: IPaginationQueryOffsetParams,
        role: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>>;
    findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        role: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>>;
    createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember>;
    createOwnersInTx(
        tx: IDatabaseTransactionClient,
        users: IWorkspaceOwnedUser[]
    ): Promise<void>;
    createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        role: EnumWorkspaceMemberRole,
        actorId: string
    ): Promise<WorkspaceMember>;
    updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumWorkspaceMemberRole,
        newRole: EnumWorkspaceMemberRole
    ): Promise<WorkspaceMember>;
    removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumWorkspaceMemberRole
    ): Promise<IWorkspaceMemberWithEmail>;
    removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number>;
    promoteToOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        fromMemberId: string,
        toMemberId: string
    ): Promise<WorkspaceMember>;
    demoteOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        fromMemberId: string
    ): Promise<WorkspaceMember>;
}
