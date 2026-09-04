import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma, Project, ProjectMember } from '@generated/prisma-client';
import { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project.member.response.dto';
import { IProjectMemberHttpService } from '@modules/project/interfaces/project.member.http.service.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberHttpService implements IProjectMemberHttpService {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly projectUtil: ProjectUtil
    ) {}

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        const { data, ...others } =
            await this.projectMemberService.getMembersList(project, pagination);

        return {
            data: this.projectUtil.mapMemberList(data),
            ...others,
        };
    }

    async assignMember(
        project: Project,
        actorId: string,
        { userId, role }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<ProjectMemberResponseDto>> {
        const member = await this.projectMemberService.assignMember(
            project,
            actorId,
            userId,
            role
        );

        return { data: this.projectUtil.mapMember(member) };
    }

    async updateMemberRole(
        project: Project,
        actorId: string,
        targetMemberId: string,
        { role }: ProjectMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.projectMemberService.updateMemberRole(
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
        await this.projectMemberService.removeMember(
            project,
            actorId,
            targetMemberId
        );
    }

    async leaveProject(project: Project, member: ProjectMember): Promise<void> {
        await this.projectMemberService.leaveProject(project, member);
    }
}
