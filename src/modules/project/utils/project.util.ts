import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { InvitationStatusResponseDto } from '@modules/invitation/dtos/response/invitation-status.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProject, IProjectMemberWithVerification } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectUtil {
    mapProject(project: IProject): ProjectResponseDto {
        return plainToInstance(ProjectResponseDto, {
            ...project,
            tenantId: project.tenantId ?? undefined,
        });
    }

    mapMember(
        member: IProjectMemberWithVerification,
        invitation: InvitationStatusResponseDto
    ): ProjectMemberResponseDto {
        return plainToInstance(ProjectMemberResponseDto, {
            id: member.id,
            projectId: member.projectId,
            userId: member.userId,
            email: member.user.email,
            roleName: member.role.name,
            status: member.status,
            createdAt: member.createdAt,
            invitation,
        });
    }

    mapMemberProjectAccess(project: IProject): ProjectAccessResponseDto {
        return plainToInstance(ProjectAccessResponseDto, {
            accessType: 'member',
            project: this.mapProject(project),
        });
    }
}
