import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma, WorkspaceMember } from '@generated/prisma-client/client';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceMemberRepository {
    findOneWithRoleByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceMemberWithRole | null>;
    findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null>;
    findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string,
        where?: Prisma.WorkspaceMemberWhereInput
    ): Promise<IWorkspaceMemberWithRole | null>;
    countOwnedActiveByUser(userId: string): Promise<number>;
    countOwners(workspaceId: string): Promise<number>;
    findReviewersByWorkspace(
        workspaceId: string
    ): Promise<{ userId: string }[]>;
    findWithPaginationOffset(
        workspaceId: string,
        params: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>>;
    findWithPaginationCursor(
        workspaceId: string,
        params: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>,
        where?: Prisma.WorkspaceMemberWhereInput
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>>;
    createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        roleId: string
    ): Promise<WorkspaceMember>;
    createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        roleId: string,
        actorId: string
    ): Promise<WorkspaceMember>;
    updateRole(targetMemberId: string, roleId: string): Promise<void>;
    removeMember(targetMemberId: string): Promise<void>;
    transferOwnership(
        fromMemberId: string,
        toMemberId: string,
        ownerRoleId: string,
        adminRoleId: string
    ): Promise<void>;
}
