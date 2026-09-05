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
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProjectHttpService } from '@modules/project/interfaces/project.http.service.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectHttpService implements IProjectHttpService {
    constructor(
        private readonly projectService: ProjectService,
        private readonly projectUtil: ProjectUtil
    ) {}

    async getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        const { data, ...others } = await this.projectService.getListForMember(
            workspaceId,
            workspaceMember,
            pagination
        );

        return {
            data: this.projectUtil.mapList(data),
            ...others,
        };
    }

    async createProject(
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const project = await this.projectService.createProject(
            workspaceId,
            actorId,
            { name, description }
        );

        return { data: this.projectUtil.mapOne(project) };
    }

    getProject(project: Project): IResponseReturn<ProjectResponseDto> {
        return {
            data: this.projectUtil.mapOne(
                this.projectService.getProject(project)
            ),
        };
    }

    async updateProject(
        project: Project,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const updated = await this.projectService.updateProject(
            project,
            actorId,
            { name, description }
        );

        return { data: this.projectUtil.mapOne(updated) };
    }

    async updateProjectSlug(
        project: Project,
        actorId: string,
        { slug }: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const updated = await this.projectService.updateProjectSlug(
            project,
            actorId,
            slug
        );

        return { data: this.projectUtil.mapOne(updated) };
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        await this.projectService.softDeleteProject(project, actorId);
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        const { data, ...others } = await this.projectService.getListForAdmin(
            pagination,
            workspaceId
        );

        return {
            data: this.projectUtil.mapList(data),
            ...others,
        };
    }

    async getByIdForAdmin(
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const project = await this.projectService.getByIdForAdmin(projectId);

        return { data: this.projectUtil.mapOne(project) };
    }
}
