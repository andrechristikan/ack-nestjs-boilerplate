import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import type {
    IWorkspaceCreate,
    IWorkspaceUpdate,
    IWorkspaceWithJoinMembers,
    IWorkspaceWithMembers,
    IWorkspaceWithTransferMembers,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceRepository {
    findActiveByIdWithMember(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceWithMembers | null>;
    findActiveByIdWithJoinMembers(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceWithJoinMembers | null>;
    findActiveByIdWithTransferMembers(
        workspaceId: string,
        targetUserId: string
    ): Promise<IWorkspaceWithTransferMembers | null>;
    findActivePublicBySlug(slug: string): Promise<Workspace | null>;
    findByIdByAdmin(workspaceId: string): Promise<Workspace | null>;
    findWithPaginationCursorByMember(
        workspaceIds: string[],
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<Workspace>>;
    findWithPaginationOffsetByAdmin(
        { where, ...others }: IPaginationQueryOffsetParams,
        isPublic: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<Workspace>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        ownerId: string,
        { name, description, isPublic }: IWorkspaceCreate,
        slug: string,
        workspaceId: string
    ): Promise<Workspace>;
    updateDetailsInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        { name, description }: IWorkspaceUpdate
    ): Promise<Workspace>;
    updateIsPublicInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        isPublic: boolean
    ): Promise<Workspace>;
    updateSlugInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        slug: string
    ): Promise<Workspace>;
    softDeleteInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<boolean>;
    existsOwnedWithOtherMembers(
        workspaceIds: string[],
        userId: string
    ): Promise<boolean>;
}
