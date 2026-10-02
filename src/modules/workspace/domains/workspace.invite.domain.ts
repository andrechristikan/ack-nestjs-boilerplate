import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
    EnumWorkspaceInviteStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project, User, Workspace } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import type { INotificationWorkspaceInvitePayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
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
import { WorkspaceOwnerRoleNotAssignableException } from '@modules/workspace/exceptions/workspace.owner-role-not-assignable.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteList,
    IWorkspaceInvitePreview,
    IWorkspaceInviteTokenData,
    IWorkspaceInviteWithRole,
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
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly configService: ConfigService,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly roleDomain: RoleDomain
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

    private assertWorkspaceRoleAssignable(role: IRole): void {
        if (role.key === EnumRoleWorkspaceKey.owner) {
            throw new WorkspaceOwnerRoleNotAssignableException();
        }
    }

    private async resolveWorkspaceRole(
        workspaceRoleId: string
    ): Promise<IRole> {
        const role = await this.roleDomain.resolve(
            workspaceRoleId,
            EnumRoleScope.workspace
        );
        this.assertWorkspaceRoleAssignable(role);

        return role;
    }

    private async resolveWorkspaceRoleInTx(
        tx: IDatabaseTransactionClient,
        workspaceRoleId: string
    ): Promise<IRole> {
        const role = await this.roleDomain.resolveInTx(
            tx,
            workspaceRoleId,
            EnumRoleScope.workspace
        );
        this.assertWorkspaceRoleAssignable(role);

        return role;
    }

    private async resolveProjectRoleInTx(
        tx: IDatabaseTransactionClient,
        projectRoleId: string | null
    ): Promise<IRole | null> {
        if (!projectRoleId) {
            return null;
        }

        return this.roleDomain.resolveInTx(
            tx,
            projectRoleId,
            EnumRoleScope.project
        );
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

    private async sendInviteNotification(
        workspace: Workspace,
        invite: IWorkspaceInviteWithRole,
        tokenData: IWorkspaceInviteTokenData,
        actorId: string,
        existingUser: User | null
    ): Promise<void> {
        const inviter = await this.userDomain.getNameById(actorId);
        const inviterName =
            inviter?.name ?? inviter?.username ?? workspace.name;

        const expiredAt = this.helperDateService.formatToIso(invite.expiredAt);
        const payloadBase: Omit<
            INotificationWorkspaceInvitePayload,
            'inviteAcceptLink'
        > = {
            workspaceId: invite.workspaceId,
            workspaceName: workspace.name,
            inviterName,
            workspaceRoleName: invite.workspaceRole.name,
            reference: invite.reference,
            expiredAt,
        };

        if (existingUser) {
            await this.notificationQueue.sendWorkspaceInvite(
                existingUser.id,
                { ...payloadBase, inviteAcceptLink: tokenData.claimLink },
                actorId
            );

            return;
        }

        await this.notificationEmailQueue.sendWorkspaceInviteUnregistered(
            invite.email,
            { ...payloadBase, inviteAcceptLink: tokenData.signUpLink }
        );
    }

    async validateInviteToken(
        token: string
    ): Promise<IWorkspaceInviteWithRole> {
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
            invitedByUserId: invite.invitedByUserId,
            workspaceRoleId: invite.workspaceRoleId,
            projectId: invite.projectId ?? null,
            projectRoleId: invite.projectRoleId ?? null,
        };
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceInviteRepository.expireStalePending();
    }

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
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
    ): Promise<IWorkspaceInviteWithRole> {
        await this.assertInvitationAllowed();

        const hasProjectId = !!create.projectId;
        const hasProjectRole = !!create.projectRoleId;
        if (hasProjectId !== hasProjectRole) {
            throw new WorkspaceInviteRoleRequiredException();
        }

        let projectRoleLookup: Promise<IRole> | null;
        if (create.projectRoleId) {
            projectRoleLookup = this.roleDomain.resolve(
                create.projectRoleId,
                EnumRoleScope.project
            );
        } else {
            projectRoleLookup = null;
        }

        let projectLookup: Promise<Project | null> | null;
        if (create.projectId) {
            projectLookup = this.projectDomain.getActiveByIdAndWorkspace(
                create.projectId,
                workspace.id
            );
        } else {
            projectLookup = null;
        }

        const [, , project, duplicate, existingUser] = await Promise.all([
            this.resolveWorkspaceRole(create.workspaceRoleId),
            projectRoleLookup,
            projectLookup,
            this.workspaceInviteRepository.existsPendingByWorkspaceAndEmail(
                workspace.id,
                create.email
            ),
            this.userDomain.getOneActiveByEmail(create.email),
        ]);
        if (create.projectId && !project) {
            throw new WorkspaceInviteProjectMismatchException();
        } else if (duplicate) {
            throw new WorkspaceInviteDuplicateException();
        }

        const tokenData = this.createInviteTokenData(create.expiryDuration);

        const workspaceInviteId = this.databaseUtil.createId();
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceInviteCreated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspace.id,
                metadata: existingUser
                    ? {
                          workspaceInviteId,
                          targetUserId: existingUser.id,
                      }
                    : { workspaceInviteId },
            }),
        ];
        if (existingUser && existingUser.id !== actorId) {
            const workspaceInviteCreatedByAdminEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceInviteCreatedByAdmin,
                    userId: existingUser.id,
                    createdBy: actorId,
                    workspaceId: workspace.id,
                    metadata: { actorUserId: actorId },
                });
            events.push(workspaceInviteCreatedByAdminEvent);
        }

        const invite = await this.workspaceInviteRepository.createPending({
            workspaceInviteId,
            workspaceId: workspace.id,
            email: create.email,
            workspaceRoleId: create.workspaceRoleId,
            projectId: create.projectId,
            projectRoleId: create.projectRoleId,
            hashedToken: tokenData.hashedToken,
            reference: tokenData.reference,
            expiredAt: tokenData.expiredAt,
            invitedByUserId: actorId,
        });

        this.activityLogDomain.stagePrepared(events);

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId,
            existingUser
        );

        return invite;
    }

    async resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        expiryDuration?: EnumWorkspaceInviteExpiry
    ): Promise<IWorkspaceInviteWithRole> {
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

        const [invite, existingUser] = await Promise.all([
            this.workspaceInviteRepository.rotateForResend(
                workspaceInviteId,
                tokenData.hashedToken,
                tokenData.reference,
                tokenData.expiredAt
            ),
            this.userDomain.getOneActiveByEmail(existing.email),
        ]);

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId,
            existingUser
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

        const existingUser = await this.userDomain.getOneActiveByEmail(
            existing.email
        );

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceInviteRevoked,
                userId: actorId,
                createdBy: actorId,
                workspaceId: workspaceId,
                metadata: existingUser
                    ? {
                          workspaceInviteId: workspaceInviteId,
                          targetUserId: existingUser.id,
                      }
                    : { workspaceInviteId: workspaceInviteId },
            }),
        ];
        if (existingUser && existingUser.id !== actorId) {
            const workspaceInviteRevokedByAdminEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceInviteRevokedByAdmin,
                    userId: existingUser.id,
                    createdBy: actorId,
                    workspaceId: workspaceId,
                    metadata: { actorUserId: actorId },
                });
            events.push(workspaceInviteRevokedByAdminEvent);
        }

        await this.workspaceInviteRepository.revoke(workspaceInviteId);

        this.activityLogDomain.stagePrepared(events);
    }

    async acceptOnSignUpInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        context: IUserSignUpWorkspaceInvite
    ): Promise<void> {
        const acceptedAt = this.helperDateService.create();

        const workspaceRole = await this.resolveWorkspaceRoleInTx(
            tx,
            context.workspaceRoleId
        );
        const projectRole = await this.resolveProjectRoleInTx(
            tx,
            context.projectRoleId
        );
        await this.workspaceMemberDomain.createInTx(
            tx,
            context.workspaceId,
            userId,
            workspaceRole.id,
            userId
        );
        await this.workspaceInviteRepository.acceptInTx(
            tx,
            context.workspaceInviteId,
            userId,
            acceptedAt
        );
        if (context.projectId && projectRole) {
            await this.projectMemberDomain.createInTx(
                tx,
                context.projectId,
                userId,
                projectRole.id,
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
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceInviteAccepted,
                userId: userId,
                createdBy: userId,
                workspaceId: invite.workspaceId,
                metadata: invite.invitedByUserId
                    ? { targetUserId: invite.invitedByUserId }
                    : {},
            }),
        ];
        if (invite.invitedByUserId && invite.invitedByUserId !== userId) {
            const workspaceInviteAcceptedByInviteeEvent =
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                    userId: invite.invitedByUserId,
                    createdBy: userId,
                    workspaceId: invite.workspaceId,
                    metadata: { actorUserId: userId },
                });
            events.push(workspaceInviteAcceptedByInviteeEvent);
        }

        await this.databaseService.withTransaction(async tx => {
            const workspaceRole = await this.resolveWorkspaceRoleInTx(
                tx,
                invite.workspaceRoleId
            );
            const projectRole = await this.resolveProjectRoleInTx(
                tx,
                invite.projectRoleId
            );
            await this.workspaceMemberDomain.createInTx(
                tx,
                invite.workspaceId,
                userId,
                workspaceRole.id,
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
            if (invite.projectId && projectRole) {
                await this.projectMemberDomain.createInTx(
                    tx,
                    invite.projectId,
                    userId,
                    projectRole.id,
                    userId
                );
            }
        });

        this.activityLogDomain.stagePrepared(events);
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
