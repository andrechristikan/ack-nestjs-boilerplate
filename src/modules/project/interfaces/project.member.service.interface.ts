import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumProjectMemberRole,
    Prisma,
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client';
import { IProjectMember } from '@modules/project/interfaces/project.interface';

export interface IProjectMemberService {
    validateProjectMemberGuard(
        projectId: string | null,
        userId: string | null
    ): Promise<ProjectMember>;
    validateProjectRoleGuard(
        projectId: string | null,
        workspaceMember: WorkspaceMember | null,
        allowedProjectRoles: EnumProjectMemberRole[]
    ): Promise<boolean>;
    getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IProjectMember>>;
    assignMember(
        project: Project,
        actorId: string,
        userId: string,
        role: EnumProjectMemberRole
    ): Promise<IProjectMember>;
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
    leaveProject(project: Project, member: ProjectMember): Promise<void>;
}
