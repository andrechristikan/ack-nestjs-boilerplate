import {
    EnumProjectInviteStatus,
    ProjectInvite,
} from '@generated/prisma-client';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InviteUtil } from '@modules/invite/utils/invite.util';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';
import { ProjectInviteResponseDto } from '@modules/project/dtos/response/project-invite.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import {
    IProject,
    IProjectMemberWithInvite,
} from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectUtil {
    constructor(private readonly inviteUtil: InviteUtil) {}

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

    mapInvite(invite: ProjectInvite): ProjectInviteResponseDto {
        return plainToInstance(ProjectInviteResponseDto, {
            id: invite.id,
            invitedById: invite.invitedById,
            invitedEmail: invite.invitedEmail,
            projectId: invite.projectId,
            projectRole: invite.projectRole,
            status: invite.status,
            expiresAt: invite.expiresAt,
            acceptedAt: invite.acceptedAt ?? undefined,
            revokedAt: invite.revokedAt ?? undefined,
            revokedById: invite.revokedById ?? undefined,
            createdAt: invite.createdAt,
            remainingSeconds:
                invite.status === EnumProjectInviteStatus.pending
                    ? this.inviteUtil.inviteRemainingSeconds(invite.expiresAt)
                    : undefined,
        });
    }
}
