import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma, Workspace } from '@generated/prisma-client';
import { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspacePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';

export interface IWorkspaceHttpService {
    getListForMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>>;
    createWorkspace(
        userId: string,
        body: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    getCurrentWorkspace(
        workspace: Workspace
    ): IResponseReturn<WorkspaceResponseDto>;
    updateWorkspace(
        workspaceId: string,
        actorId: string,
        body: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        body: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        body: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    switchWorkspace(
        userId: string,
        body: WorkspaceSwitchRequestDto
    ): Promise<void>;
    softDeleteWorkspace(workspaceId: string, actorId: string): Promise<void>;
    getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>>;
    getByIdForAdmin(
        workspaceId: string
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    previewWorkspace(
        slug: string
    ): Promise<IResponseReturn<WorkspacePreviewResponseDto>>;
}
