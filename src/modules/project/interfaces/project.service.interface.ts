import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Project, WorkspaceMember } from '@generated/prisma-client';
import {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';

export interface IProjectService {
    validateProjectGuard(
        workspaceId: string | null,
        projectId: string | null
    ): Promise<Project>;
    getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>>;
    createProject(
        workspaceId: string,
        actorId: string,
        create: IProjectCreate
    ): Promise<Project>;
    getProject(project: Project): Project;
    updateProject(
        project: Project,
        actorId: string,
        update: IProjectUpdate
    ): Promise<Project>;
    updateProjectSlug(
        project: Project,
        actorId: string,
        slug: string
    ): Promise<Project>;
    softDeleteProject(project: Project, actorId: string): Promise<void>;
    getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>>;
    getByIdForAdmin(projectId: string): Promise<Project>;
}
