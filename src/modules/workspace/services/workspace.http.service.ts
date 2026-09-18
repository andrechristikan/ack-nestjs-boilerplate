import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceHttpService {
    constructor(private readonly workspaceDomain: WorkspaceDomain) {}

    async getListForMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePagingReturn<Workspace>> {
        const { data, ...others } = await this.workspaceDomain.getListForMember(
            userId,
            pagination
        );

        return {
            data,
            ...others,
        };
    }

    async createWorkspace(
        userId: string,
        { name, description, isPublic }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceDomain.createWorkspace(userId, {
            name,
            description,
            isPublic,
        });

        return { data: workspace };
    }

    getCurrentWorkspace(workspace: Workspace): IResponseReturn<Workspace> {
        const current = this.workspaceDomain.getCurrentWorkspace(workspace);

        return { data: current };
    }

    async updateWorkspace(
        workspaceId: string,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceDomain.updateWorkspace(
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
        const workspace = await this.workspaceDomain.updateWorkspaceIsPublic(
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
        const workspace = await this.workspaceDomain.updateWorkspaceSlug(
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
        await this.workspaceDomain.switchWorkspace(userId, workspaceId);
    }

    async softDeleteWorkspace(
        workspaceId: string,
        actorId: string
    ): Promise<void> {
        await this.workspaceDomain.softDeleteWorkspace(workspaceId, actorId);
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<Workspace>> {
        const { data, ...others } = await this.workspaceDomain.getListForAdmin(
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
            await this.workspaceDomain.getByIdForAdmin(workspaceId);

        return { data: workspace };
    }

    async previewWorkspace(slug: string): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceDomain.previewWorkspace(slug);

        return { data: workspace };
    }
}
