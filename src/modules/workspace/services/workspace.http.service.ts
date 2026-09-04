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
import { IWorkspaceHttpService } from '@modules/workspace/interfaces/workspace.http.service.interface';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceHttpService implements IWorkspaceHttpService {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    async getListForMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>> {
        const { data, ...others } =
            await this.workspaceService.getListForMember(userId, pagination);

        return {
            data: this.workspaceUtil.mapList(data),
            ...others,
        };
    }

    async createWorkspace(
        userId: string,
        { name, description, isPublic, slug }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const workspace = await this.workspaceService.createWorkspace(userId, {
            name,
            description,
            isPublic,
            slug,
        });

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    getCurrentWorkspace(
        workspace: Workspace
    ): IResponseReturn<WorkspaceResponseDto> {
        return {
            data: this.workspaceUtil.mapOne(
                this.workspaceService.getCurrentWorkspace(workspace)
            ),
        };
    }

    async updateWorkspace(
        workspaceId: string,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const workspace = await this.workspaceService.updateWorkspace(
            workspaceId,
            actorId,
            { name, description }
        );

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        { isPublic }: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const workspace = await this.workspaceService.updateWorkspaceIsPublic(
            workspaceId,
            actorId,
            isPublic
        );

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        { slug }: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const workspace = await this.workspaceService.updateWorkspaceSlug(
            workspaceId,
            actorId,
            slug
        );

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async switchWorkspace(
        userId: string,
        { workspaceId }: WorkspaceSwitchRequestDto
    ): Promise<void> {
        await this.workspaceService.switchWorkspace(userId, workspaceId);
    }

    async softDeleteWorkspace(
        workspaceId: string,
        actorId: string
    ): Promise<void> {
        await this.workspaceService.softDeleteWorkspace(workspaceId, actorId);
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>> {
        const { data, ...others } = await this.workspaceService.getListForAdmin(
            pagination,
            isPublic
        );

        return {
            data: this.workspaceUtil.mapList(data),
            ...others,
        };
    }

    async getByIdForAdmin(
        workspaceId: string
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        const workspace =
            await this.workspaceService.getByIdForAdmin(workspaceId);

        return { data: this.workspaceUtil.mapOne(workspace) };
    }

    async previewWorkspace(
        slug: string
    ): Promise<IResponseReturn<WorkspacePreviewResponseDto>> {
        const workspace = await this.workspaceService.previewWorkspace(slug);

        return { data: this.workspaceUtil.mapPreview(workspace) };
    }
}
