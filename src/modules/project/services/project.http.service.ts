import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectHttpService {
    constructor(private readonly projectDomain: ProjectDomain) {}

    async getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>> {
        const { data, ...others } = await this.projectDomain.getListForMember(
            workspaceId,
            workspaceMember,
            pagination
        );

        return {
            data,
            ...others,
        };
    }

    async createProject(
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const project = await this.projectDomain.createProject(
            workspaceId,
            actorId,
            { name, description }
        );

        return { data: project };
    }

    getProject(project: Project): IResponseReturn<Project> {
        const current = this.projectDomain.getProject(project);

        return { data: current };
    }

    async updateProject(
        project: Project,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const updated = await this.projectDomain.updateProject(
            project,
            actorId,
            { name, description }
        );

        return { data: updated };
    }

    async updateProjectSlug(
        project: Project,
        actorId: string,
        { slug }: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<Project>> {
        const updated = await this.projectDomain.updateProjectSlug(
            project,
            actorId,
            slug
        );

        return { data: updated };
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        await this.projectDomain.softDeleteProject(project, actorId);
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>> {
        const { data, ...others } = await this.projectDomain.getListForAdmin(
            pagination,
            workspaceId
        );

        return {
            data,
            ...others,
        };
    }

    async getByIdForAdmin(
        projectId: string
    ): Promise<IResponseReturn<Project>> {
        const project = await this.projectDomain.getByIdForAdmin(projectId);

        return { data: project };
    }
}
