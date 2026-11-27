import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceInviteStatus,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceInvite } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IUserCreateWorkspaceInvite } from '@modules/user/interfaces/user.interface';
import { WorkspaceInviteNoncePattern } from '@modules/workspace/constants/workspace.constant';
import type { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteList,
    IWorkspaceInviteNotice,
    IWorkspaceInvitePrepared,
    IWorkspaceInvitePreview,
    IWorkspaceInvitePreviewSummary,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceInviteService {
    private readonly baseUrl: string;
    private readonly tokenLength: number;
    private readonly referencePrefix: string;
    private readonly referenceRandomLength: number;
    private readonly linkPattern: string;
    private readonly signUpLinkPattern: string;

    constructor(
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly featureFlagService: FeatureFlagService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService,
        private readonly awsSesService: AwsSesService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.baseUrl = this.configService.get<string>('frontend.baseUrl')!;
        this.tokenLength = this.configService.get<number>(
            'workspace.invite.tokenLength'
        )!;
        this.referencePrefix = this.configService.get<string>(
            'workspace.invite.referencePrefix'
        )!;
        this.referenceRandomLength = this.configService.get<number>(
            'workspace.invite.referenceRandomLength'
        )!;
        this.linkPattern = this.configService.get<string>(
            'workspace.invite.linkPattern'
        )!;
        this.signUpLinkPattern = this.configService.get<string>(
            'workspace.invite.signUpLinkPattern'
        )!;
    }

    private inviteEffect(
        invite: IWorkspaceInviteList,
        { claimLink, signUpLink }: IWorkspaceInviteTokenData,
        actorId: string,
        { workspaceName, inviterName, inviteeUserId }: IWorkspaceInviteNotice
    ): IOutboxEffect {
        const expiredAt = this.helperDateService.formatToIso(invite.expiredAt);
        const fields = {
            workspaceId: invite.workspaceId,
            workspaceName,
            inviterName,
            reference: invite.reference,
            workspaceMemberRole: invite.workspaceRole,
            expiredAt,
        };
        if (inviteeUserId === null) {
            return this.notificationEmailQueue.notifyUnregisteredInvite(
                invite.email,
                { ...fields, inviteAcceptLink: signUpLink }
            );
        }

        return this.notificationQueue.notify(
            EnumNotificationKind.workspaceInvite,
            {
                userId: inviteeUserId,
                proceedBy: actorId,
                ...fields,
                inviteAcceptLink: claimLink,
            }
        );
    }

    private inviteActivityEffects(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        action: EnumActivityLogAction,
        byAdminAction: EnumActivityLogAction,
        workspaceId: string,
        workspaceInviteId: string,
        inviteeUserId: string | null
    ): IOutboxEffect[] {
        const actorId = authContext.userId;
        const actorEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            {
                action,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
                metadata:
                    inviteeUserId === null
                        ? { workspaceInviteId }
                        : { workspaceInviteId, targetUserId: inviteeUserId },
            }
        );
        if (inviteeUserId === null || inviteeUserId === actorId) {
            return [actorEntry];
        }

        const inviteeEntry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            {
                action: byAdminAction,
                userId: inviteeUserId,
                createdBy: actorId,
                workspaceId,
                metadata: { actorUserId: actorId },
            }
        );

        return [actorEntry, inviteeEntry];
    }

    private isInviteEmailMatch(inviteEmail: string, email: string): boolean {
        return inviteEmail.toLowerCase() === email.toLowerCase();
    }

    assertEmailDeliverable(): void {
        const isSesInitialized = this.awsSesService.isInitialized();
        if (!isSesInitialized) {
            throw new AwsSesNotConfiguredException();
        }
    }

    async resolveExpiresInDays(
        expiryDuration: EnumWorkspaceInviteExpiry | null
    ): Promise<number> {
        if (expiryDuration !== null) {
            return expiryDuration;
        }

        const expiresInDays = await this.featureFlagService.getMetadataNumber(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.inviteExpiresInDays
        );

        return expiresInDays;
    }

    createInviteTokenData(expiresInDays: number): IWorkspaceInviteTokenData {
        const token = this.helperStringService.random(this.tokenLength);
        const hashedToken = this.helperHashService.sha256Hash(token);
        const referenceRandom = this.helperStringService.random(
            this.referenceRandomLength
        );
        const reference = `${this.referencePrefix}-${referenceRandom}`;
        const now = this.helperDateService.now();
        const expiredAt = this.helperDateService.forward(
            now,
            Duration.fromObject({
                days: expiresInDays,
            })
        );
        const claimLink = this.helperStringService.fillPattern(
            this.linkPattern,
            { frontendBaseUrl: this.baseUrl, token }
        );
        const signUpLink = this.helperStringService.fillPattern(
            this.signUpLinkPattern,
            { frontendBaseUrl: this.baseUrl, token }
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

    mapInvitePreview(
        invite: IWorkspaceInvitePreview,
        inviterName: string
    ): IWorkspaceInvitePreviewSummary {
        if (invite.invitedBy.deletedAt !== null) {
            return {
                workspaceName: invite.workspace.name,
                inviterName: invite.workspace.name,
                workspaceRole: invite.workspaceRole,
                expiredAt: invite.expiredAt,
            };
        }

        return {
            workspaceName: invite.workspace.name,
            inviterName,
            workspaceRole: invite.workspaceRole,
            expiredAt: invite.expiredAt,
        };
    }

    /** Gates on `workspace.invitationAllowed` and reads the pending invite of a token with its workspace and inviter name; a soft-deleted workspace throws the workspace-not-found exception. */
    async validateInviteToken(token: string): Promise<IWorkspaceInvitePreview> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const [invite] = await Promise.all([
            this.workspaceInviteRepository.findPendingByHashedToken(
                hashedToken
            ),
            this.featureFlagService.validateFeatureFlagMetadata(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            ),
        ]);
        if (!invite) {
            throw new WorkspaceInviteInvalidException();
        }
        if (invite.workspace.deletedAt !== null) {
            throw new WorkspaceNotFoundException();
        }

        return invite;
    }

    /** Gates and reads like `validateInviteToken`; an invite issued to another email throws the invalid-invite exception. */
    async validateInviteForEmail(
        token: string,
        email: string
    ): Promise<WorkspaceInvite> {
        const invite = await this.validateInviteToken(token);
        const isEmailMatch = this.isInviteEmailMatch(invite.email, email);
        if (!isEmailMatch) {
            throw new WorkspaceInviteInvalidException();
        }

        return invite;
    }

    /** Null when the sign-up carries no token; otherwise the pending invite of the token for the email, or the invalid-invite exception. */
    async getSignUpInvite(
        token: string | null,
        email: string
    ): Promise<WorkspaceInvite | null> {
        if (!token) {
            return null;
        }

        return this.validateInviteForEmail(token, email);
    }

    async assertInviteeNotMember(
        workspaceId: string,
        userId: string
    ): Promise<void> {
        const existingMember =
            await this.workspaceMemberService.getOneByWorkspaceAndUser(
                workspaceId,
                userId
            );
        if (existingMember) {
            throw new WorkspaceMemberAlreadyExistsException();
        }
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceInviteRepository.expireStalePending();
    }

    async revokePendingByWorkspacesInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        updatedBy: string
    ): Promise<void> {
        await this.workspaceInviteRepository.revokePendingByWorkspacesInTx(
            tx,
            workspaceIds,
            updatedBy
        );
    }

    async revokePendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        email: string
    ): Promise<void> {
        await this.workspaceInviteRepository.revokePendingByEmailInTx(
            tx,
            workspaceId,
            email
        );
    }

    async revokeAllPendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        email: string,
        updatedBy: string
    ): Promise<void> {
        await this.workspaceInviteRepository.revokeAllPendingByEmailInTx(
            tx,
            email,
            updatedBy
        );
    }

    async clearProjectInTx(
        tx: IDatabaseTransactionClient,
        projectId: string
    ): Promise<void> {
        await this.workspaceInviteRepository.clearProjectInTx(tx, projectId);
    }

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        const [page] = await Promise.all([
            this.workspaceInviteRepository.findWithPaginationCursor(
                workspaceId,
                pagination,
                status ?? null
            ),
            this.featureFlagService.validateFeatureFlagMetadata(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            ),
        ]);

        return page;
    }

    /** Gates on `workspace.invitationAllowed`, then asserts the project id and role are both set or both null. */
    async assertProjectRolePaired({
        projectId,
        projectRole,
    }: IWorkspaceInviteCreate): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );
        const hasProjectId = projectId !== null;
        const hasProjectRole = projectRole !== null;
        if (hasProjectId !== hasProjectRole) {
            throw new WorkspaceInviteRoleRequiredException();
        }
    }

    assertCreatable(
        { projectId }: IWorkspaceInviteCreate,
        project: Project | null
    ): void {
        if (projectId !== null && !project) {
            throw new WorkspaceInviteProjectMismatchException();
        }
    }

    /** Draws the invite id, hashes the workspace-and-email nonce, and resolves the lifetime; call it before the transaction. */
    async prepareInvite(
        workspaceId: string,
        create: IWorkspaceInviteCreate
    ): Promise<IWorkspaceInvitePrepared> {
        const workspaceInviteId = this.databaseUtil.createId();
        const noncePattern = this.helperStringService.fillPattern(
            WorkspaceInviteNoncePattern,
            { workspaceId, email: create.email }
        );
        const nonce = this.helperHashService.sha256Hash(noncePattern);
        const expiresInDays = await this.resolveExpiresInDays(
            create.expiryDuration
        );

        return { workspaceInviteId, nonce, expiresInDays };
    }

    async createInviteInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        create: IWorkspaceInviteCreate,
        { workspaceInviteId, nonce }: IWorkspaceInvitePrepared,
        tokenData: IWorkspaceInviteTokenData,
        notice: IWorkspaceInviteNotice
    ): Promise<IWorkspaceInviteList> {
        const actorId = authContext.userId;
        const created = await this.workspaceInviteRepository.createPendingInTx(
            tx,
            {
                workspaceInviteId,
                workspaceId,
                email: create.email,
                workspaceRole: create.workspaceRole,
                projectId: create.projectId,
                projectRole: create.projectRole,
                hashedToken: tokenData.hashedToken,
                reference: tokenData.reference,
                expiredAt: tokenData.expiredAt,
                invitedByUserId: actorId,
                nonce,
            }
        );
        const effect = this.inviteEffect(created, tokenData, actorId, notice);
        const entries = this.inviteActivityEffects(
            requestContext,
            apiKeyContext,
            authContext,
            EnumActivityLogAction.workspaceInviteCreated,
            EnumActivityLogAction.workspaceInviteCreatedByAdmin,
            workspaceId,
            created.id,
            notice.inviteeUserId
        );
        await this.outboxService.addManyInTx(tx, [effect, ...entries]);

        return created;
    }

    /** Gates on `workspace.invitationAllowed` and reads the invite of the workspace; a missing one throws not-found and a non-pending one already-processed. */
    async getPendingById(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite> {
        const [existing] = await Promise.all([
            this.workspaceInviteRepository.findByIdAndWorkspace(
                workspaceInviteId,
                workspaceId
            ),
            this.featureFlagService.validateFeatureFlagMetadata(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.invitationAllowed
            ),
        ]);
        if (!existing) {
            throw new WorkspaceInviteNotFoundException();
        } else if (existing.status !== EnumWorkspaceInviteStatus.pending) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        return existing;
    }

    async getResendableById(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite> {
        const existing = await this.getPendingById(
            workspaceInviteId,
            workspaceId
        );
        const now = this.helperDateService.now();
        if (existing.expiredAt <= now) {
            throw new WorkspaceInviteInvalidException();
        }

        return existing;
    }

    async resendInviteInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceInviteId: string,
        tokenData: IWorkspaceInviteTokenData,
        notice: IWorkspaceInviteNotice
    ): Promise<IWorkspaceInviteList> {
        const actorId = authContext.userId;
        const resentAt = this.helperDateService.now();
        const rotated =
            await this.workspaceInviteRepository.rotateForResendInTx(
                tx,
                workspaceInviteId,
                tokenData.hashedToken,
                tokenData.reference,
                tokenData.expiredAt,
                resentAt
            );

        const effect = this.inviteEffect(rotated, tokenData, actorId, notice);
        const entries = this.inviteActivityEffects(
            requestContext,
            apiKeyContext,
            authContext,
            EnumActivityLogAction.workspaceInviteResent,
            EnumActivityLogAction.workspaceInviteResentByAdmin,
            rotated.workspaceId,
            workspaceInviteId,
            notice.inviteeUserId
        );
        await this.outboxService.addManyInTx(tx, [effect, ...entries]);

        return rotated;
    }

    async revokeInviteInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceInviteId: string,
        workspaceId: string,
        inviteeUserId: string | null
    ): Promise<void> {
        const revoked = await this.workspaceInviteRepository.revokeInTx(
            tx,
            workspaceInviteId
        );
        if (!revoked) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        const entries = this.inviteActivityEffects(
            requestContext,
            apiKeyContext,
            authContext,
            EnumActivityLogAction.workspaceInviteRevoked,
            EnumActivityLogAction.workspaceInviteRevokedByAdmin,
            workspaceId,
            workspaceInviteId,
            inviteeUserId
        );
        await this.outboxService.addManyInTx(tx, entries);
    }

    async acceptPendingInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<WorkspaceInvite> {
        return this.workspaceInviteRepository.acceptInTx(
            tx,
            workspaceInviteId,
            userId,
            acceptedAt
        );
    }

    async acceptOnSignUpInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        context: IUserCreateWorkspaceInvite
    ): Promise<void> {
        const acceptedAt = this.helperDateService.now();

        const accepted = await this.acceptPendingInTx(
            tx,
            context.workspaceInviteId,
            userId,
            acceptedAt
        );
        await this.workspaceMemberService.createInTx(
            tx,
            accepted.workspaceId,
            userId,
            accepted.workspaceRole,
            userId
        );
    }
}
