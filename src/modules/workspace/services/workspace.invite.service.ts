import type { IRoleRef } from '@modules/role/interfaces/role.interface';
import type { Prisma } from '@generated/prisma-client/client';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
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
import type {
    Project,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserService } from '@modules/user/services/user.service';
import type {
    IUserName,
    IUserSignUpWorkspaceInvite,
} from '@modules/user/interfaces/user.interface';
import { WorkspaceInviteNoncePattern } from '@modules/workspace/constants/workspace.constant';
import type { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteIssued,
    IWorkspaceInviteList,
    IWorkspaceInviteNotice,
    IWorkspaceInvitePreviewSummary,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceInviteService {
    private readonly referenceMaxAttempts: number;
    private readonly baseUrl: string;
    private readonly tokenLength: number;
    private readonly referencePrefix: string;
    private readonly referenceRandomLength: number;
    private readonly linkPattern: string;
    private readonly signUpLinkPattern: string;

    constructor(
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
        private readonly activityLogService: ActivityLogService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.referenceMaxAttempts = this.configService.get<number>(
            'workspace.invite.referenceMaxAttempts'
        )!;
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

    private resolveInviterName(
        inviter: IUserName | null,
        workspace: Workspace
    ): string {
        return inviter?.name ?? inviter?.username ?? workspace.name;
    }

    private async resolveExpiresInDays(
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

    private createInviteTokenData(
        expiresInDays: number
    ): IWorkspaceInviteTokenData {
        const token = this.helperStringService.random(this.tokenLength);
        const hashedToken = this.helperHashService.sha256Hash(token);
        const referenceRandom = this.helperStringService.random(
            this.referenceRandomLength
        );
        const reference = `${this.referencePrefix}-${referenceRandom}`;
        const now = this.helperDateService.create();
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

    private inviteEffect(
        invite: WorkspaceInvite,
        { claimLink, signUpLink }: IWorkspaceInviteTokenData,
        actorId: string,
        {
            workspaceName,
            workspaceRoleName,
            inviterName,
            inviteeUserId,
        }: IWorkspaceInviteNotice
    ): IOutboxEffect {
        const expiredAt = this.helperDateService.formatToIso(invite.expiredAt);
        const fields = {
            workspaceId: invite.workspaceId,
            workspaceName,
            inviterName,
            reference: invite.reference,
            workspaceMemberRole: workspaceRoleName,
            expiredAt,
        };
        if (inviteeUserId === null) {
            return this.notificationService.notifyUnregisteredInvite(
                invite.email,
                { ...fields, inviteAcceptLink: signUpLink }
            );
        }

        return this.notificationService.notify(
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
        const actorEntry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
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

        const inviteeEntry = this.activityLogService.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
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

    mapInvitePreview(
        workspace: Workspace,
        invite: WorkspaceInvite,
        inviter: IUserName | null,
        workspaceRole: IRoleRef
    ): IWorkspaceInvitePreviewSummary {
        const inviterName = this.resolveInviterName(inviter, workspace);

        return {
            workspaceName: workspace.name,
            inviterName,
            workspaceRole,
            expiredAt: invite.expiredAt,
        };
    }

    async getInviterName(
        workspace: Workspace,
        actorId: string
    ): Promise<string> {
        const inviter = await this.userService.getNameById(actorId);

        return this.resolveInviterName(inviter, workspace);
    }

    /** Gates on `workspace.invitationAllowed`, then reads the pending invite of a token. */
    async validateInviteToken(token: string): Promise<WorkspaceInvite> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );
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

    async revokePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        await this.workspaceInviteRepository.revokePendingByWorkspaceInTx(
            tx,
            workspaceId
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
        email: string
    ): Promise<void> {
        await this.workspaceInviteRepository.revokeAllPendingByEmailInTx(
            tx,
            email
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
        status: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceInviteWhereInput | null
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );

        return this.workspaceInviteRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status,
            additionalWhere
        );
    }

    /** Gates on `workspace.invitationAllowed`, then asserts the project id and role are both set or both null. */
    async assertProjectRolePaired({
        projectId,
        projectRoleId,
    }: IWorkspaceInviteCreate): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );
        const hasProjectId = projectId !== null;
        const hasProjectRole = projectRoleId !== null;
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

    /** Creates the pending invite and adds its notification row and activity entries in one transaction per attempt, dispatched after the commit. */
    async createInvite(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceId: string,
        create: IWorkspaceInviteCreate,
        notice: IWorkspaceInviteNotice
    ): Promise<IWorkspaceInviteIssued> {
        const actorId = authContext.userId;
        const workspaceInviteId = this.databaseUtil.createId();
        const noncePattern = this.helperStringService.fillPattern(
            WorkspaceInviteNoncePattern,
            { workspaceId, email: create.email }
        );
        const nonce = this.helperHashService.sha256Hash(noncePattern);

        const expiresInDays = await this.resolveExpiresInDays(
            create.expiryDuration
        );

        for (let attempt = 0; attempt < this.referenceMaxAttempts; attempt++) {
            const tokenData = this.createInviteTokenData(expiresInDays);

            try {
                const invite = await this.outboxService.withTransaction(
                    async tx => {
                        const created =
                            await this.workspaceInviteRepository.createPendingInTx(
                                tx,
                                {
                                    workspaceInviteId,
                                    workspaceId,
                                    email: create.email,
                                    workspaceRoleId: create.workspaceRoleId,
                                    projectId: create.projectId,
                                    projectRoleId: create.projectRoleId,
                                    hashedToken: tokenData.hashedToken,
                                    reference: tokenData.reference,
                                    expiredAt: tokenData.expiredAt,
                                    invitedByUserId: actorId,
                                    nonce,
                                }
                            );
                        const effect = this.inviteEffect(
                            created,
                            tokenData,
                            actorId,
                            notice
                        );
                        await this.outboxService.addInTx(tx, effect);
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
                        await this.outboxService.addManyInTx(tx, entries);

                        return created;
                    }
                );

                return { invite, tokenData };
            } catch (err: unknown) {
                const isDuplicate = this.databaseUtil.isUniqueCollision(
                    err,
                    'nonce'
                );
                if (isDuplicate) {
                    throw new WorkspaceInviteDuplicateException();
                }

                const isTokenCollision = this.databaseUtil.isUniqueCollision(
                    err,
                    'token'
                );
                const isReferenceCollision =
                    this.databaseUtil.isUniqueCollision(err, 'reference');
                if (isTokenCollision || isReferenceCollision) {
                    continue;
                }

                if (err instanceof AppBaseException) {
                    throw err;
                }

                const mapped = this.databaseUtil.toException(err);
                if (mapped instanceof DatabaseWriteConflictException) {
                    throw new WorkspaceInviteDuplicateException();
                }

                throw new AppUnknownException(err);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    /** Gates on `workspace.invitationAllowed`, then reads the invite of the workspace; a missing one throws not-found and a non-pending one already-processed. */
    async getPendingById(
        workspaceInviteId: string,
        workspaceId: string,
        additionalWhere: Prisma.WorkspaceInviteWhereInput | null
    ): Promise<WorkspaceInvite> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );
        const existing =
            await this.workspaceInviteRepository.findByIdAndWorkspace(
                workspaceInviteId,
                workspaceId,
                additionalWhere
            );
        if (!existing) {
            throw new WorkspaceInviteNotFoundException();
        } else if (existing.status !== EnumWorkspaceInviteStatus.pending) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        return existing;
    }

    async getResendableById(
        workspaceInviteId: string,
        workspaceId: string,
        additionalWhere: Prisma.WorkspaceInviteWhereInput | null
    ): Promise<WorkspaceInvite> {
        const existing = await this.getPendingById(
            workspaceInviteId,
            workspaceId,
            additionalWhere
        );
        const now = this.helperDateService.create();
        if (existing.expiredAt <= now) {
            throw new WorkspaceInviteInvalidException();
        }

        return existing;
    }

    /** Rotates the invite token and adds its notification row and activity entries in one transaction per attempt, dispatched after the commit. */
    async resendInvite(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceInviteId: string,
        expiryDuration: EnumWorkspaceInviteExpiry | null,
        notice: IWorkspaceInviteNotice
    ): Promise<IWorkspaceInviteIssued> {
        const actorId = authContext.userId;
        const resentAt = this.helperDateService.create();

        const expiresInDays = await this.resolveExpiresInDays(expiryDuration);

        for (let attempt = 0; attempt < this.referenceMaxAttempts; attempt++) {
            const tokenData = this.createInviteTokenData(expiresInDays);

            try {
                const invite = await this.outboxService.withTransaction(
                    async tx => {
                        const rotated =
                            await this.workspaceInviteRepository.rotateForResendInTx(
                                tx,
                                workspaceInviteId,
                                tokenData.hashedToken,
                                tokenData.reference,
                                tokenData.expiredAt,
                                resentAt
                            );
                        if (!rotated) {
                            throw new WorkspaceInviteAlreadyProcessedException();
                        }

                        const effect = this.inviteEffect(
                            rotated,
                            tokenData,
                            actorId,
                            notice
                        );
                        await this.outboxService.addInTx(tx, effect);
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
                        await this.outboxService.addManyInTx(tx, entries);

                        return rotated;
                    }
                );

                return { invite, tokenData };
            } catch (err: unknown) {
                if (err instanceof AppBaseException) {
                    throw err;
                }

                const isTokenCollision = this.databaseUtil.isUniqueCollision(
                    err,
                    'token'
                );
                const isReferenceCollision =
                    this.databaseUtil.isUniqueCollision(err, 'reference');
                if (isTokenCollision || isReferenceCollision) {
                    continue;
                }

                const mapped = this.databaseUtil.toException(err);
                if (mapped instanceof DatabaseWriteConflictException) {
                    throw new WorkspaceInviteAlreadyProcessedException();
                }

                throw new AppUnknownException(err);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    /** Revokes the pending invite and adds its activity entries in one transaction, dispatched after the commit. */
    async revokeInvite(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceInviteId: string,
        workspaceId: string,
        inviteeUserId: string | null
    ): Promise<void> {
        try {
            await this.outboxService.withTransaction(async tx => {
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
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }
    }

    async acceptPendingInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<void> {
        try {
            const accepted = await this.workspaceInviteRepository.acceptInTx(
                tx,
                workspaceInviteId,
                userId,
                acceptedAt
            );
            if (!accepted) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }
    }

    async acceptOnSignUpInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        context: IUserSignUpWorkspaceInvite
    ): Promise<void> {
        const acceptedAt = this.helperDateService.create();

        await this.acceptPendingInTx(
            tx,
            context.workspaceInviteId,
            userId,
            acceptedAt
        );
        await this.workspaceMemberService.createInTx(
            tx,
            context.workspaceId,
            userId,
            context.workspaceMemberRoleId,
            userId
        );
    }

    async getWorkspaceOfInvite(invite: WorkspaceInvite): Promise<Workspace> {
        const workspace = await this.workspaceRepository.findActiveById(
            invite.workspaceId
        );
        if (!workspace) {
            throw new WorkspaceInviteInvalidException();
        }

        return workspace;
    }
}
