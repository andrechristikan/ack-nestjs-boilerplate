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
    EnumWorkspaceInviteStatus,
    Prisma,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { INotificationWorkspaceInvitePayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
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
import { IWorkspaceInviteService } from '@modules/workspace/interfaces/workspace.invite.service.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class WorkspaceInviteService implements IWorkspaceInviteService {
    private readonly homeUrl: string;
    private readonly inviteExpiredInDays: number;
    private readonly inviteTokenLength: number;
    private readonly inviteReferencePrefix: string;
    private readonly inviteReferenceRandomLength: number;
    private readonly inviteLinkBaseUrl: string;

    constructor(
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly configService: ConfigService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailUtil: NotificationEmailUtil,
        private readonly featureFlagService: FeatureFlagService
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
        this.inviteLinkBaseUrl = this.configService.get<string>(
            'workspace.invite.linkBaseUrl'
        )!;
    }

    private async assertInvitationAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
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
        const link = `${this.homeUrl}/${this.inviteLinkBaseUrl}/${token}`;

        return { token, hashedToken, reference, expiredAt, link };
    }

    private async sendInviteNotification(
        workspace: Workspace,
        invite: WorkspaceInvite,
        tokenData: IWorkspaceInviteTokenData,
        actorId: string
    ): Promise<void> {
        const [inviter, existingUser] = await Promise.all([
            this.workspaceInviteRepository.findInviterNameById(actorId),
            this.workspaceInviteRepository.findActiveUserByEmail(invite.email),
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
                    tokenData.link,
                    existingUser.id
                );

            await this.notificationUtil.sendWorkspaceInvite(
                existingUser.id,
                { ...payloadBase, encryptedInviteAcceptLink },
                actorId
            );

            return;
        }

        const encryptedInviteAcceptLink =
            this.helperEncryptionService.aes256EncryptSimple(
                tokenData.link,
                invite.reference
            );

        await this.notificationEmailUtil.sendWorkspaceInviteUnregistered(
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

        const requestLog = this.workspaceUtil.getCurrentRequestLog();

        const hasProjectId = !!create.projectId;
        const hasProjectRole = !!create.projectRole;
        if (hasProjectId !== hasProjectRole) {
            throw new WorkspaceInviteRoleRequiredException();
        }

        const [project, duplicate] = await Promise.all([
            create.projectId
                ? this.workspaceInviteRepository.findActiveProjectByIdAndWorkspace(
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

        const invite = await this.workspaceInviteRepository.createPending(
            {
                workspaceId: workspace.id,
                email: create.email,
                workspaceRole: create.workspaceRole,
                projectId: create.projectId,
                projectRole: create.projectRole,
                hashedToken: tokenData.hashedToken,
                reference: tokenData.reference,
                expiredAt: tokenData.expiredAt,
                invitedByUserId: actorId,
            },
            requestLog
        );

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

        const requestLog = this.workspaceUtil.getCurrentRequestLog();

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

        await this.workspaceInviteRepository.revoke(
            workspaceInviteId,
            workspaceId,
            actorId,
            requestLog
        );
    }

    async claimInvite(
        userId: string,
        userEmail: string,
        inviteToken: string
    ): Promise<void> {
        await this.assertInvitationAllowed();

        const requestLog = this.workspaceUtil.getCurrentRequestLog();

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

        await this.workspaceInviteRepository.acceptForExistingUser(
            userId,
            invite,
            invite.workspaceRole,
            requestLog
        );
    }

    async previewInvite(inviteToken: string): Promise<IWorkspaceInvitePreview> {
        await this.assertInvitationAllowed();

        const invite = await this.validateInviteToken(inviteToken);

        const [workspace, inviter] = await Promise.all([
            this.workspaceRepository.findActiveById(invite.workspaceId),
            this.workspaceInviteRepository.findInviterNameById(
                invite.invitedByUserId
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceInviteInvalidException();
        }

        return { workspace, invite, inviter };
    }
}
