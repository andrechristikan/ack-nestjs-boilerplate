import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberHttpService {
    constructor(
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain
    ) {}

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        const { data, ...others } =
            await this.projectMemberDomain.getMembersList(project, pagination);

        return {
            data,
            ...others,
        };
    }

    async assignMember(
        project: Project,
        actorId: string,
        { userId, role }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        const targetMember =
            await this.workspaceMemberDomain.getOneByWorkspaceAndUser(
                project.workspaceId,
                userId
            );
        const member = await this.projectMemberDomain.assignMember(
            project,
            actorId,
            targetMember,
            role
        );

        return { data: member };
    }

    async updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        { role }: ProjectMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.projectMemberDomain.updateMemberRole(
            project,
            actorId,
            targetMemberId,
            role
        );
    }

    async removeMember(
        project: Project,
        actorId: string,
        targetMemberId: string
    ): Promise<void> {
        await this.projectMemberDomain.removeMember(
            project,
            actorId,
            targetMemberId
        );
    }

    async leaveProject(project: Project, member: ProjectMember): Promise<void> {
        await this.projectMemberDomain.leaveProject(project, member);
    }
}
