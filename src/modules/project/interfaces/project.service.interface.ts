import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumProjectMemberRole,
    Prisma,
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';

export interface IProjectService {
    validateProjectGuard(
        workspaceId: string | null,
        projectId: string | null
    ): Promise<Project>;
    validateProjectMemberGuard(
        projectId: string | null,
        userId: string | null
    ): Promise<ProjectMember>;
    validateProjectRoleGuard(
        projectId: string | null,
        workspaceMember: WorkspaceMember | null,
        allowedProjectRoles: EnumProjectMemberRole[]
    ): Promise<boolean>;
    getListForMember(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<ProjectResponseDto>>;
    createProject(
        workspaceId: string,
        actorId: string,
        dto: ProjectCreateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>>;
    getProject(project: Project): IResponseReturn<ProjectResponseDto>;
    updateProject(
        project: Project,
        actorId: string,
        dto: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<ProjectResponseDto>>;
    updateProjectSlug(
        project: Project,
        actorId: string,
        slug: string
    ): Promise<IResponseReturn<ProjectResponseDto>>;
    softDeleteProject(project: Project, actorId: string): Promise<void>;

    getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>>;
    assignMember(
        project: Project,
        actorId: string,
        dto: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<ProjectMemberResponseDto>>;
    updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        newRole: EnumProjectMemberRole
    ): Promise<void>;
    removeMember(
        project: Project,
        actorId: string,
        targetMemberId: string
    ): Promise<void>;
    leaveProject(
        project: Project,
        member: ProjectMember
    ): Promise<void>;

    getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<ProjectResponseDto>>;
    getByIdForAdmin(
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>>;
}
