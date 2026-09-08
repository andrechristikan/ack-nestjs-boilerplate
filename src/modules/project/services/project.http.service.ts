import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma, Project, WorkspaceMember } from '@generated/prisma-client';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { IProjectHttpService } from '@modules/project/interfaces/project.http.service.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectHttpService implements IProjectHttpService {
    constructor(private readonly projectService: ProjectService) {}

    async getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>> {
        const { data, ...others } = await this.projectService.getListForMember(
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
        const project = await this.projectService.createProject(
            workspaceId,
            actorId,
            { name, description }
        );

        return { data: project };
    }

    getProject(project: Project): IResponseReturn<Project> {
        return {
            data: this.projectService.getProject(project),
        };
    }

    async updateProject(
        project: Project,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const updated = await this.projectService.updateProject(
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
        const updated = await this.projectService.updateProjectSlug(
            project,
            actorId,
            slug
        );

        return { data: updated };
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        await this.projectService.softDeleteProject(project, actorId);
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>> {
        const { data, ...others } = await this.projectService.getListForAdmin(
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
        const project = await this.projectService.getByIdForAdmin(projectId);

        return { data: project };
    }
}
