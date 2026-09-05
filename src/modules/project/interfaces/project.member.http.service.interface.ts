import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma, Project, ProjectMember } from '@generated/prisma-client';
import { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { IProjectMember } from '@modules/project/interfaces/project.interface';

export interface IProjectMemberHttpService {
    getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IProjectMember>>;
    assignMember(
        project: Project,
        actorId: string,
        body: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>>;
    updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        body: ProjectMemberUpdateRoleRequestDto
    ): Promise<void>;
    removeMember(
        project: Project,
        actorId: string,
        targetMemberId: string
    ): Promise<void>;
    leaveProject(project: Project, member: ProjectMember): Promise<void>;
}
