import { Injectable } from '@nestjs/common';
import { ProjectRoleViewer } from '@modules/project/constants/project.constant';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { InvitationStatusResponseDto } from '@modules/invitation/dtos/response/invitation-status.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProject, IProjectMemberWithVerification } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectUtil {
    mapProject(project: IProject): ProjectResponseDto {
        return {
            id: project.id,
            tenantId: project.tenantId ?? undefined,
            name: project.name,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }

    mapMember(
        member: IProjectMemberWithVerification,
        invitation: InvitationStatusResponseDto
    ): ProjectMemberResponseDto {
        return {
            id: member.id,
            projectId: member.projectId,
            userId: member.userId,
            email: member.user.email,
            roleName: member.role.name,
            status: member.status,
            createdAt: member.createdAt,
            invitation,
        };
    }

    mapMemberProjectAccess(project: IProject): ProjectAccessResponseDto {
        return {
            accessType: 'member',
            project: this.mapProject(project),
        };
    }
}
