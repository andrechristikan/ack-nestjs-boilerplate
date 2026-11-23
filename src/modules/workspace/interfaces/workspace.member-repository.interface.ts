import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceMemberRepository {
    findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceMemberWithRole | null>;
    findOneOwnerByWorkspace(
        workspaceId: string
    ): Promise<IWorkspaceMemberWithRole | null>;
    findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IWorkspaceMemberWithRole | null>;
    findReviewerUserIdsByWorkspace(workspaceId: string): Promise<string[]>;
    findWorkspaceIdsByUser(
        userId: string,
        role: EnumRoleWorkspaceKey | null
    ): Promise<string[]>;
    findWorkspaceIdsByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        role: EnumRoleWorkspaceKey | null
    ): Promise<string[]>;
    findWithPaginationOffset(
        workspaceId: string,
        { where, ...others }: IPaginationQueryOffsetParams,
        roleKey: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>>;
    findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        roleKey: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>>;
    createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        ownerRoleId: string
    ): Promise<IWorkspaceMemberWithRole>;
    createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        roleId: string,
        actorId: string
    ): Promise<IWorkspaceMemberWithRole>;
    updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string,
        newRoleId: string
    ): Promise<boolean>;
    removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string
    ): Promise<boolean>;
    removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number>;
    promoteToOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        fromMemberId: string,
        toMemberId: string,
        ownerRoleId: string
    ): Promise<boolean>;
    demoteOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        fromMemberId: string,
        ownerRoleId: string,
        adminRoleId: string
    ): Promise<boolean>;
}
