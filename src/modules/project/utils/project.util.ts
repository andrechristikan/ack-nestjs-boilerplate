import {
    EnumProjectInviteStatus,
    ProjectInvite,
} from '@generated/prisma-client';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helper/services/helper.service';
import { plainToInstance } from 'class-transformer';
import {
    InviteConfig,
    InviteTokenCreate,
} from '@modules/invite/interfaces/invite.interface';
import { ProjectInvitePublicResponseDto } from '@modules/project/dtos/response/project-invite-public.response.dto';
import { ProjectInviteStatusResponseDto } from '@modules/project/dtos/response/project-invite-status.response.dto';
import { ProjectInviteResponseDto } from '@modules/project/dtos/response/project-invite.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import {
    IProject,
    IProjectMemberWithInvite,
} from '@modules/project/interfaces/project.interface';
import { Duration } from 'luxon';

@Injectable()
export class ProjectUtil {
    private readonly homeUrl: string;

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.homeUrl = this.configService.get<string>('home.url');
    }

    private inviteCreateReference(prefix: string, length: number): string {
        const random = this.helperService.randomString(length);

        return `${prefix}-${random}`;
    }

    private inviteCreateToken(length: number): string {
        return this.helperService.randomString(length);
    }

    private inviteSetExpiredDate(expiredInMinutes: number): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: expiredInMinutes })
        );
    }

    createInviteToken(config: InviteConfig): InviteTokenCreate {
        const token = this.inviteCreateToken(config.tokenLength);

        return {
            reference: this.inviteCreateReference(
                config.reference.prefix,
                config.reference.length
            ),
            expiresAt: this.inviteSetExpiredDate(config.expiredInMinutes),
            token,
            expiredInMinutes: config.expiredInMinutes,
            resendInMinutes: config.resendInMinutes,
            link: `${this.homeUrl}/${config.linkBaseUrl}/${token}`,
        };
    }

    createInviteLink(token: string, linkBaseUrl: string): string {
        return `${this.homeUrl}/${linkBaseUrl}/${token}`;
    }

    inviteRemainingSeconds(expiresAt: Date): number {
        return this.helperService
            .dateDiff(expiresAt, this.helperService.dateCreate())
            .as('seconds');
    }

    mapInviteStatus(invite: {
        status: EnumProjectInviteStatus;
        expiresAt?: Date | null;
        sentAt?: Date | null;
        acceptedAt?: Date | null;
        revokedAt?: Date | null;
    }): ProjectInviteStatusResponseDto {
        const remainingSeconds =
            invite.status === EnumProjectInviteStatus.pending &&
            invite.expiresAt
                ? Math.max(
                      0,
                      Math.floor(this.inviteRemainingSeconds(invite.expiresAt))
                  )
                : undefined;

        return plainToInstance(ProjectInviteStatusResponseDto, {
            status: invite.status,
            expiresAt: invite.expiresAt ?? undefined,
            sentAt: invite.sentAt ?? undefined,
            acceptedAt: invite.acceptedAt ?? undefined,
            revokedAt: invite.revokedAt ?? undefined,
            remainingSeconds,
        });
    }

    mapProject(project: IProject): ProjectResponseDto {
        return plainToInstance(ProjectResponseDto, project);
    }

    mapMember(
        member: IProjectMemberWithInvite,
        invite?: ProjectInviteStatusResponseDto
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

    mapPublicInvite(
        invite: Pick<ProjectInvite, 'invitedEmail' | 'status' | 'expiresAt'>,
        isVerified: boolean
    ): ProjectInvitePublicResponseDto {
        return plainToInstance(ProjectInvitePublicResponseDto, {
            email: invite.invitedEmail,
            isVerified,
            status: invite.status,
            expiresAt: invite.expiresAt,
            remainingSeconds:
                invite.status === EnumProjectInviteStatus.pending
                    ? this.inviteRemainingSeconds(invite.expiresAt)
                    : undefined,
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
                    ? this.inviteRemainingSeconds(invite.expiresAt)
                    : undefined,
        });
    }
}
