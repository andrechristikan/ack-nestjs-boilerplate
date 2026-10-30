import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { INotificationWorkspaceInvitePushPayload } from '@modules/notification/interfaces/notification.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWithWorkspaceInput } from '@modules/user/interfaces/user.interface';
import type {
    IWorkspaceInviteInviter,
    IWorkspaceInvitePreviewSummary,
    IWorkspaceInviteTokenData,
    IWorkspaceOwnedUser,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class WorkspaceUtil {
    private readonly homeUrl: string;
    private readonly slugRegex: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;
    private readonly inviteExpiredInDays: number;
    private readonly inviteTokenLength: number;
    private readonly inviteReferencePrefix: string;
    private readonly inviteReferenceRandomLength: number;
    private readonly inviteLinkPattern: string;
    private readonly inviteSignUpLinkPattern: string;
    private readonly joinRequestReviewLinkPattern: string;

    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;
        this.slugRegex = this.configService.get<RegExp>('workspace.slugRegex')!;
        this.slugPrefix = this.configService.get<string>(
            'workspace.slugPrefix'
        )!;
        this.slugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'workspace.slugMaxAttempts'
        )!;
        this.inviteExpiredInDays = this.configService.get<number>(
            'workspace.invite.expiredInDays'
        )!;
        this.inviteTokenLength = this.configService.get<number>(
            'workspace.invite.tokenLength'
        )!;
        this.inviteReferencePrefix = this.configService.get<string>(
            'workspace.invite.referencePrefix'
        )!;
        this.inviteReferenceRandomLength = this.configService.get<number>(
            'workspace.invite.referenceRandomLength'
        )!;
        this.inviteLinkPattern = this.configService.get<string>(
            'workspace.invite.linkPattern'
        )!;
        this.inviteSignUpLinkPattern = this.configService.get<string>(
            'workspace.invite.signUpLinkPattern'
        )!;
        this.joinRequestReviewLinkPattern = this.configService.get<string>(
            'workspace.joinRequest.reviewLinkPattern'
        )!;
    }

    mapInvitePreview(
        workspace: Workspace,
        invite: WorkspaceInvite,
        inviter: IWorkspaceInviteInviter | null
    ): IWorkspaceInvitePreviewSummary {
        const inviterName = this.resolveInviterName(inviter, workspace);

        return {
            workspaceName: workspace.name,
            inviterName,
            workspaceRole: invite.workspaceRole,
            expiredAt: invite.expiredAt,
        };
    }

    resolveInviterName(
        inviter: IWorkspaceInviteInviter | null,
        workspace: Workspace
    ): string {
        return inviter?.name ?? inviter?.username ?? workspace.name;
    }

    resolveRequesterName(requester: IWorkspaceInviteInviter | null): string {
        return requester?.name ?? requester?.username ?? 'A user';
    }

    createInviteTokenData(
        expiryDurationInDays: number | null
    ): IWorkspaceInviteTokenData {
        const token = this.helperStringService.random(this.inviteTokenLength);
        const hashedToken = this.helperHashService.sha256Hash(token);
        const referenceRandom = this.helperStringService.random(
            this.inviteReferenceRandomLength
        );
        const reference = `${this.inviteReferencePrefix}-${referenceRandom}`;
        const now = this.helperDateService.create();
        const expiredAt = this.helperDateService.forward(
            now,
            Duration.fromObject({
                days: expiryDurationInDays ?? this.inviteExpiredInDays,
            })
        );
        const claimLink = this.helperStringService.fillPattern(
            this.inviteLinkPattern,
            { homeUrl: this.homeUrl, token }
        );
        const signUpLink = this.helperStringService.fillPattern(
            this.inviteSignUpLinkPattern,
            { homeUrl: this.homeUrl, token }
        );

        return {
            token,
            hashedToken,
            reference,
            expiredAt,
            claimLink,
            signUpLink,
        };
    }

    mapInviteNotificationPayload(
        workspace: Workspace,
        invite: WorkspaceInvite,
        inviterName: string
    ): INotificationWorkspaceInvitePushPayload {
        const expiredAt = this.helperDateService.formatToIso(invite.expiredAt);

        return {
            workspaceId: invite.workspaceId,
            workspaceName: workspace.name,
            inviterName,
            workspaceMemberRole: invite.workspaceRole,
            reference: invite.reference,
            expiredAt,
        };
    }

    buildJoinRequestReviewLink(joinRequestId: string): string {
        return this.helperStringService.fillPattern(
            this.joinRequestReviewLinkPattern,
            { homeUrl: this.homeUrl, joinRequestId }
        );
    }

    isInviteEmailMatch(inviteEmail: string, email: string): boolean {
        return inviteEmail.toLowerCase() === email.toLowerCase();
    }

    isPeerActionAllowed(
        actorRole: EnumWorkspaceMemberRole,
        targetRole: EnumWorkspaceMemberRole
    ): boolean {
        if (targetRole === EnumWorkspaceMemberRole.owner) {
            return false;
        }

        return !(
            actorRole === EnumWorkspaceMemberRole.admin &&
            targetRole === EnumWorkspaceMemberRole.admin
        );
    }

    hasRole(
        member: WorkspaceMember,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): boolean {
        return (
            member.role === EnumWorkspaceMemberRole.owner ||
            allowedRoles.includes(member.role)
        );
    }

    drawSlugCandidates(): string[] {
        return this.helperStringService.generateSlugCandidates(
            this.slugPrefix,
            this.slugMaxLength,
            this.slugMaxAttempts
        );
    }

    isSlugAllowed(slug: string): boolean {
        const isPatternValid = this.slugRegex.test(slug);

        return slug.length <= this.slugMaxLength && isPatternValid;
    }

    buildOwnedUsers(
        inputs: IUserCreateWithWorkspaceInput[],
        slugAttempt: number
    ): IWorkspaceOwnedUser[] {
        return inputs.flatMap(input => {
            if (
                input.workspaceContext.type !==
                EnumUserSignUpWorkspaceContextType.personal
            ) {
                return [];
            }

            return [
                {
                    userId: input.userId,
                    workspaceId: input.workspaceContext.workspaceId,
                    name: input.workspaceContext.name,
                    slug: input.workspaceContext.slugCandidates[slugAttempt]!,
                },
            ];
        });
    }

    countSlugAttempts(inputs: IUserCreateWithWorkspaceInput[]): number {
        const slugAttemptCount = inputs.reduce((min, input) => {
            if (
                input.workspaceContext.type !==
                EnumUserSignUpWorkspaceContextType.personal
            ) {
                return min;
            }

            return Math.min(min, input.workspaceContext.slugCandidates.length);
        }, Number.POSITIVE_INFINITY);

        return Number.isFinite(slugAttemptCount) ? slugAttemptCount : 1;
    }
}
