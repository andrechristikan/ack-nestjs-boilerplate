import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import {
    IProject,
    IProjectMemberWithInvite,
} from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectUtil {
    mapProject(project: IProject): ProjectResponseDto {
        return plainToInstance(ProjectResponseDto, project);
    }

    mapMember(
        member: IProjectMemberWithInvite,
        invite: InviteStatusResponseDto
    ): ProjectMemberResponseDto {
        return plainToInstance(ProjectMemberResponseDto, {
            id: member.id,
            projectId: member.projectId,
            userId: member.userId,
            email: member.user.email,
            role: member.role,
            status: member.status,
            createdAt: member.createdAt,
            invite,
        });
    }

    mapMemberProjectAccess(project: IProject): ProjectAccessResponseDto {
        return plainToInstance(ProjectAccessResponseDto, {
            accessType: 'member',
            project: this.mapProject(project),
        });
    }
}
