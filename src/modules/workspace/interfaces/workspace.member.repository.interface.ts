import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceMemberRepository {
    findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null>;
    findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string
    ): Promise<WorkspaceMember | null>;
    countOwnedActiveByUser(userId: string): Promise<number>;
    countOwners(workspaceId: string): Promise<number>;
    findReviewersByWorkspace(
        workspaceId: string
    ): Promise<{ userId: string }[]>;
    findWithPaginationOffset(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>>;
    findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>>;
    createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember>;
    createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        role: EnumWorkspaceMemberRole,
        actorId: string
    ): Promise<WorkspaceMember>;
    updateRole(
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void>;
    removeMember(targetMemberId: string): Promise<void>;
    transferOwnership(fromMemberId: string, toMemberId: string): Promise<void>;
}
