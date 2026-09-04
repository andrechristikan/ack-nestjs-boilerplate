import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Workspace } from '@generated/prisma-client';
import {
    IWorkspaceCreate,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceService {
    validateWorkspaceGuard(workspaceId: string | null): Promise<Workspace>;
    getListForMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePagingReturn<Workspace>>;
    createWorkspace(
        userId: string,
        create: IWorkspaceCreate
    ): Promise<Workspace>;
    getCurrentWorkspace(workspace: Workspace): Workspace;
    updateWorkspace(
        workspaceId: string,
        actorId: string,
        update: IWorkspaceUpdate
    ): Promise<Workspace>;
    updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        isPublic: boolean
    ): Promise<Workspace>;
    updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        slug: string
    ): Promise<Workspace>;
    switchWorkspace(userId: string, workspaceId: string): Promise<void>;
    softDeleteWorkspace(workspaceId: string, actorId: string): Promise<void>;
    getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<Workspace>>;
    getByIdForAdmin(workspaceId: string): Promise<Workspace>;
    previewWorkspace(slug: string): Promise<Workspace>;
}
