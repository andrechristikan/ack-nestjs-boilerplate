import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceInviteStatus,
    Prisma,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { INotificationWorkspaceInvitePayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import {
    IUserSignUpWorkspaceContext,
    IUserSignUpWorkspaceInvite,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import {
    IWorkspaceInviteCreate,
    IWorkspaceInvitePreview,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class WorkspaceInviteDomain {
    private readonly homeUrl: string;
    private readonly inviteExpiredInDays: number;
    private readonly inviteTokenLength: number;
    private readonly inviteReferencePrefix: string;
    private readonly inviteReferenceRandomLength: number;
    private readonly inviteLinkPattern: string;
    private readonly inviteSignUpLinkPattern: string;

    constructor(
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly projectDomain: ProjectDomain,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly userDomain: UserDomain,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly configService: ConfigService,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly featureFlagDomain: FeatureFlagDomain
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;
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
    }

    private async assertInvitationAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'invitationAllowed'
        );
    }

    private createInviteTokenData(
        expiryDurationInDays?: number
    ): IWorkspaceInviteTokenData {
        const token = this.helperStringService.random(this.inviteTokenLength);
        const hashedToken = this.helperHashService.sha256Hash(token);
        const reference = `${this.inviteReferencePrefix}-${this.helperStringService.random(
            this.inviteReferenceRandomLength
        )}`;
        const expiredAt = this.helperDateService.forward(
            this.helperDateService.create(),
            Duration.fromObject({
                days: expiryDurationInDays ?? this.inviteExpiredInDays,
            })
        );
        const claimLink = this.inviteLinkPattern
            .replace('{homeUrl}', this.homeUrl)
            .replace('{token}', token);
        const signUpLink = this.inviteSignUpLinkPattern
            .replace('{homeUrl}', this.homeUrl)
            .replace('{token}', token);

        return {
            token,
            hashedToken,
            reference,
            expiredAt,
            claimLink,
            signUpLink,
        };
    }

    private async sendInviteNotification(
        workspace: Workspace,
        invite: WorkspaceInvite,
        tokenData: IWorkspaceInviteTokenData,
        actorId: string
    ): Promise<void> {
        const [inviter, existingUser] = await Promise.all([
            this.userDomain.getNameById(actorId),
            this.userDomain.getOneActiveByEmail(invite.email),
        ]);
        const inviterName =
            inviter?.name ?? inviter?.username ?? workspace.name;

        const payloadBase: Omit<
            INotificationWorkspaceInvitePayload,
            'encryptedInviteAcceptLink'
        > = {
            workspaceId: invite.workspaceId,
            workspaceName: workspace.name,
            inviterName,
            workspaceMemberRole: invite.workspaceRole,
            reference: invite.reference,
            expiredAt: this.helperDateService.formatToIso(invite.expiredAt),
        };

        if (existingUser) {
            const encryptedInviteAcceptLink =
                this.helperEncryptionService.aes256EncryptSimple(
                    tokenData.claimLink,
                    existingUser.id
                );

            await this.notificationQueue.sendWorkspaceInvite(
                existingUser.id,
                { ...payloadBase, encryptedInviteAcceptLink },
                actorId
            );

            return;
        }

        const encryptedInviteAcceptLink =
            this.helperEncryptionService.aes256EncryptSimple(
                tokenData.signUpLink,
                invite.reference
            );

        await this.notificationEmailQueue.sendWorkspaceInviteUnregistered(
            invite.email,
            { ...payloadBase, encryptedInviteAcceptLink }
        );
    }

    async validateInviteToken(token: string): Promise<WorkspaceInvite> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const invite =
            await this.workspaceInviteRepository.findPendingByHashedToken(
                hashedToken
            );
        if (!invite) {
            throw new WorkspaceInviteInvalidException();
        }

        return invite;
    }

    async resolveForSignUp(
        inviteToken: string | null,
        email: string,
        username: string
    ): Promise<IUserSignUpWorkspaceContext> {
        if (!inviteToken) {
            const [personalContext] =
                this.userOnboardingDomain.buildPersonalWorkspaceContexts([
                    username,
                ]);

            return personalContext;
        }

        await this.assertInvitationAllowed();
        const hashedToken = this.helperHashService.sha256Hash(inviteToken);
        const invite =
            await this.workspaceInviteRepository.findPendingByHashedToken(
                hashedToken
            );

        if (!invite || invite.email.toLowerCase() !== email.toLowerCase()) {
            throw new WorkspaceInviteInvalidException();
        }

        return {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            workspaceMemberRole: invite.workspaceRole,
            projectId: invite.projectId ?? null,
            projectMemberRole: invite.projectRole ?? null,
        };
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceInviteRepository.expireStalePending();
    }

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceInvite>> {
        await this.assertInvitationAllowed();

        return this.workspaceInviteRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status
        );
    }

    async createInvite(
        workspace: Workspace,
        actorId: string,
        create: IWorkspaceInviteCreate
    ): Promise<WorkspaceInvite> {
        await this.assertInvitationAllowed();

        const hasProjectId = !!create.projectId;
        const hasProjectRole = !!create.projectRole;
        if (hasProjectId !== hasProjectRole) {
            throw new WorkspaceInviteRoleRequiredException();
        }

        const [project, duplicate] = await Promise.all([
            create.projectId
                ? this.projectDomain.getActiveByIdAndWorkspace(
                      create.projectId,
                      workspace.id
                  )
                : null,
            this.workspaceInviteRepository.existsPendingByWorkspaceAndEmail(
                workspace.id,
                create.email
            ),
        ]);
        if (create.projectId && !project) {
            throw new WorkspaceInviteProjectMismatchException();
        } else if (duplicate) {
            throw new WorkspaceInviteDuplicateException();
        }

        const tokenData = this.createInviteTokenData(create.expiryDuration);

        const invite = await this.databaseService.withTransaction(async tx => {
            const created =
                await this.workspaceInviteRepository.createPendingInTx(tx, {
                    workspaceId: workspace.id,
                    email: create.email,
                    workspaceRole: create.workspaceRole,
                    projectId: create.projectId,
                    projectRole: create.projectRole,
                    hashedToken: tokenData.hashedToken,
                    reference: tokenData.reference,
                    expiredAt: tokenData.expiredAt,
                    invitedByUserId: actorId,
                });
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: actorId,
                workspaceId: workspace.id,
            });

            return created;
        });

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId
        );

        return invite;
    }

    async resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        expiryDuration?: EnumWorkspaceInviteExpiry
    ): Promise<WorkspaceInvite> {
        await this.assertInvitationAllowed();

        const existing =
            await this.workspaceInviteRepository.findByIdAndWorkspace(
                workspaceInviteId,
                workspace.id
            );
        if (!existing) {
            throw new WorkspaceInviteNotFoundException();
        } else if (existing.status !== EnumWorkspaceInviteStatus.pending) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        const tokenData = this.createInviteTokenData(expiryDuration);

        const invite = await this.workspaceInviteRepository.rotateForResend(
            workspaceInviteId,
            actorId,
            tokenData.hashedToken,
            tokenData.reference,
            tokenData.expiredAt
        );

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId
        );

        return invite;
    }

    async revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void> {
        await this.assertInvitationAllowed();

        const existing =
            await this.workspaceInviteRepository.findByIdAndWorkspace(
                workspaceInviteId,
                workspaceId
            );
        if (!existing) {
            throw new WorkspaceInviteNotFoundException();
        } else if (existing.status !== EnumWorkspaceInviteStatus.pending) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        await this.databaseService.withTransaction(async tx => {
            await this.workspaceInviteRepository.revokeInTx(
                tx,
                workspaceInviteId,
                actorId
            );
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.workspaceInviteRevoked,
                userId: actorId,
                workspaceId: workspaceId,
            });
        });
    }

    async acceptOnSignUpInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        context: IUserSignUpWorkspaceInvite
    ): Promise<void> {
        const acceptedAt = this.helperDateService.create();

        await this.workspaceMemberDomain.createInTx(
            tx,
            context.workspaceId,
            userId,
            context.workspaceMemberRole,
            userId
        );
        await this.workspaceInviteRepository.acceptInTx(
            tx,
            context.workspaceInviteId,
            userId,
            acceptedAt
        );
        if (context.projectId && context.projectMemberRole) {
            await this.projectMemberDomain.createInTx(
                tx,
                context.projectId,
                userId,
                context.projectMemberRole,
                userId
            );
        }
    }

    async claimInvite(
        userId: string,
        userEmail: string,
        inviteToken: string
    ): Promise<void> {
        await this.assertInvitationAllowed();

        const invite = await this.validateInviteToken(inviteToken);
        if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new WorkspaceInviteInvalidException();
        }

        const existingMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                invite.workspaceId,
                userId
            );
        if (existingMember) {
            throw new WorkspaceInviteInvalidException();
        }

        const today = this.helperDateService.create();

        await this.databaseService.withTransaction(async tx => {
            await this.workspaceMemberDomain.createInTx(
                tx,
                invite.workspaceId,
                userId,
                invite.workspaceRole,
                userId
            );
            await this.workspaceInviteRepository.acceptInTx(
                tx,
                invite.id,
                userId,
                today
            );
            await this.userDomain.setLastWorkspaceInTx(
                tx,
                userId,
                invite.workspaceId
            );
            if (invite.projectId && invite.projectRole) {
                await this.projectMemberDomain.createInTx(
                    tx,
                    invite.projectId,
                    userId,
                    invite.projectRole,
                    userId
                );
            }
            this.activityLogDomain.stage({
                action: EnumActivityLogAction.workspaceInviteAccepted,
                userId: userId,
                workspaceId: invite.workspaceId,
            });
        });
    }

    async previewInvite(inviteToken: string): Promise<IWorkspaceInvitePreview> {
        await this.assertInvitationAllowed();

        const invite = await this.validateInviteToken(inviteToken);

        const [workspace, inviter] = await Promise.all([
            this.workspaceRepository.findActiveById(invite.workspaceId),
            invite.invitedByUserId
                ? this.userDomain.getNameById(invite.invitedByUserId)
                : null,
        ]);
        if (!workspace) {
            throw new WorkspaceInviteInvalidException();
        }

        return { workspace, invite, inviter };
    }
}
