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

export interface IProjectHttpService {
    getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<ProjectResponseDto>>;
    createProject(
        workspaceId: string,
        actorId: string,
        body: ProjectCreateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>>;
    getProject(project: Project): IResponseReturn<ProjectResponseDto>;
    updateProject(
        project: Project,
        actorId: string,
        body: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>>;
    updateProjectSlug(
        project: Project,
        actorId: string,
        body: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>>;
    softDeleteProject(project: Project, actorId: string): Promise<void>;
    getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<ProjectResponseDto>>;
    getByIdForAdmin(
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>>;
}
