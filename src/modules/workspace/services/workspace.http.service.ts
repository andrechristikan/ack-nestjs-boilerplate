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
import { IWorkspaceHttpService } from '@modules/workspace/interfaces/workspace.http.service.interface';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceHttpService implements IWorkspaceHttpService {
    constructor(private readonly workspaceService: WorkspaceService) {}

    async getListForMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePagingReturn<Workspace>> {
        const { data, ...others } =
            await this.workspaceService.getListForMember(userId, pagination);

        return {
            data,
            ...others,
        };
    }

    async createWorkspace(
        userId: string,
        { name, description, isPublic }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.createWorkspace(userId, {
            name,
            description,
            isPublic,
        });

        return { data: workspace };
    }

    getCurrentWorkspace(workspace: Workspace): IResponseReturn<Workspace> {
        return {
            data: this.workspaceService.getCurrentWorkspace(workspace),
        };
    }

    async updateWorkspace(
        workspaceId: string,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.updateWorkspace(
            workspaceId,
            actorId,
            { name, description }
        );

        return { data: workspace };
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        { isPublic }: WorkspaceUpdateIsPublicRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.updateWorkspaceIsPublic(
            workspaceId,
            actorId,
            isPublic
        );

        return { data: workspace };
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        { slug }: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.updateWorkspaceSlug(
            workspaceId,
            actorId,
            slug
        );

        return { data: workspace };
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
    ): Promise<IResponsePagingReturn<Workspace>> {
        const { data, ...others } = await this.workspaceService.getListForAdmin(
            pagination,
            isPublic
        );

        return {
            data,
            ...others,
        };
    }

    async getByIdForAdmin(
        workspaceId: string
    ): Promise<IResponseReturn<Workspace>> {
        const workspace =
            await this.workspaceService.getByIdForAdmin(workspaceId);

        return { data: workspace };
    }

    async previewWorkspace(slug: string): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.previewWorkspace(slug);

        return { data: workspace };
    }
}
