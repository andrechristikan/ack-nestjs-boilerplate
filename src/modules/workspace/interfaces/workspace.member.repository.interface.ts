import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
    WorkspaceMember,
} from '@generated/prisma-client';
import { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';

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
        createdBy: string
    ): Promise<WorkspaceMember>;
    updateRoleInTx(
        tx: IDatabaseTransactionClient,
        actorId: string,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void>;
    removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string
    ): Promise<void>;
    transferOwnershipInTx(
        tx: IDatabaseTransactionClient,
        fromMemberId: string,
        toMemberId: string,
        actorId: string
    ): Promise<void>;
}
