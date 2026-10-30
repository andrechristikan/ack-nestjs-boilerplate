import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type {
    Project,
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import {
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import type { WorkspaceInvitePreviewRequestDto } from '@modules/workspace/dtos/request/workspace.invite-preview.request.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteInvitee,
    IWorkspaceInviteList,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteHttpService {
    constructor(
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly projectDomain: ProjectDomain,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly userDomain: UserDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    private async assertInvitationAllowed(): Promise<void> {
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'invitationAllowed'
        );
    }

    private async getInviterName(
        workspace: Workspace,
        actorId: string
    ): Promise<string> {
        const inviter = await this.userDomain.getNameById(actorId);

        return this.workspaceUtil.resolveInviterName(inviter, workspace);
    }

    private async getInviteeRecipient(
        existingUser: User | null
    ): Promise<INotificationRecipient | null> {
        if (!existingUser) {
            return null;
        }

        const [ownerships, settings] = await Promise.all([
            this.deviceDomain.getOwnershipsWithNotificationToken(
                existingUser.id
            ),
            this.notificationDomain.getListUserSetting(existingUser.id),
        ]);
        const tokens = ownerships.map(ownership => ownership.notificationToken);

        return this.notificationUtil.mapRecipient(
            existingUser,
            EnumNotificationKind.workspaceInvite,
            tokens,
            settings
        );
    }

    private async getInviteeByEmail(
        email: string
    ): Promise<IWorkspaceInviteInvitee> {
        const existingUser = await this.userDomain.getOneActiveByEmail(email);
        const recipient = await this.getInviteeRecipient(existingUser);

        return { existingUser, recipient };
    }

    private prepareInviteActivityLogs(
        action: EnumActivityLogAction,
        byAdminAction: EnumActivityLogAction,
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string,
        existingUser: User | null
    ): IActivityLogStaged[] {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
                metadata: existingUser
                    ? { workspaceInviteId, targetUserId: existingUser.id }
                    : { workspaceInviteId },
            }),
        ];
        if (existingUser && existingUser.id !== actorId) {
            const byAdminActivityLog = this.activityLogDomain.prepare({
                action: byAdminAction,
                userId: existingUser.id,
                createdBy: actorId,
                workspaceId,
                metadata: { actorUserId: actorId },
            });
            activityLogs.push(byAdminActivityLog);
        }

        return activityLogs;
    }

    private async sendInviteNotification(
        workspace: Workspace,
        invite: WorkspaceInvite,
        tokenData: IWorkspaceInviteTokenData,
        actorId: string,
        inviterName: string,
        recipient: INotificationRecipient | null
    ): Promise<void> {
        const payload = this.workspaceUtil.mapInviteNotificationPayload(
            workspace,
            invite,
            inviterName
        );

        if (recipient) {
            await this.notificationQueue.sendWorkspaceInvite(
                recipient,
                { ...payload, inviteAcceptLink: tokenData.claimLink },
                actorId
            );

            return;
        }

        await this.notificationEmailQueue.sendWorkspaceInviteUnregistered(
            invite.email,
            { ...payload, inviteAcceptLink: tokenData.signUpLink }
        );
    }

    async getInvitesList(
        workspaceId: string,
        query: WorkspaceInviteListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        // Sequential by design: gate before the work it guards
        await this.assertInvitationAllowed();

        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceInviteWhereInput>(
                query,
                {
                    availableSearch: WorkspaceInviteDefaultAvailableSearch,
                    availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
                }
            );
        const status = this.paginationQueryUtil.inEnum(
            Prisma.WorkspaceInviteScalarFieldEnum.status,
            query.status,
            WorkspaceInviteDefaultStatus
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceInviteDomain.getInvitesList(
                workspaceId,
                params,
                status?.where
            );

        return {
            data,
            ...others,
        };
    }

    async createInvite(
        workspace: Workspace,
        actorId: string,
        {
            email,
            workspaceRole,
            projectId,
            projectRole,
            expiryDuration,
        }: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        // Sequential by design: gate before the work it guards
        await this.assertInvitationAllowed();

        const create: IWorkspaceInviteCreate = {
            email,
            workspaceRole,
            projectId: projectId ?? null,
            projectRole: projectRole ?? null,
            expiryDuration: expiryDuration ?? null,
        };
        this.workspaceInviteDomain.assertProjectRolePaired(create);

        let projectLookup: Promise<Project | null> | null = null;
        if (create.projectId !== null) {
            projectLookup = this.projectDomain.getActiveByIdAndWorkspace(
                create.projectId,
                workspace.id
            );
        }

        const [project, duplicate, existingUser] = await Promise.all([
            projectLookup,
            this.workspaceInviteDomain.existsPendingByEmail(
                workspace.id,
                create.email
            ),
            this.userDomain.getOneActiveByEmail(create.email),
        ]);
        this.workspaceInviteDomain.assertCreatable(create, project, duplicate);

        const tokenData = this.workspaceUtil.createInviteTokenData(
            create.expiryDuration
        );

        // Sequential by design: write must not run if an earlier step throws
        const [inviterName, recipient] = await Promise.all([
            this.getInviterName(workspace, actorId),
            this.getInviteeRecipient(existingUser),
        ]);
        const invite = await this.workspaceInviteDomain.createInvite(
            workspace.id,
            actorId,
            create,
            tokenData
        );

        const activityLogs = this.prepareInviteActivityLogs(
            EnumActivityLogAction.workspaceInviteCreated,
            EnumActivityLogAction.workspaceInviteCreatedByAdmin,
            workspace.id,
            actorId,
            invite.id,
            existingUser
        );
        this.activityLogDomain.stagePrepared(activityLogs);

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId,
            inviterName,
            recipient
        );

        return { data: invite };
    }

    async resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        // Sequential by design: gate before the work it guards
        await this.assertInvitationAllowed();
        const existing = await this.workspaceInviteDomain.getPendingById(
            workspaceInviteId,
            workspace.id
        );

        const tokenData = this.workspaceUtil.createInviteTokenData(
            expiryDuration ?? null
        );

        const [inviterName, { existingUser, recipient }] = await Promise.all([
            this.getInviterName(workspace, actorId),
            this.getInviteeByEmail(existing.email),
        ]);

        const activityLogs = this.prepareInviteActivityLogs(
            EnumActivityLogAction.workspaceInviteResent,
            EnumActivityLogAction.workspaceInviteResentByAdmin,
            workspace.id,
            actorId,
            workspaceInviteId,
            existingUser
        );

        // Sequential by design: write must not run if an earlier step throws
        const invite = await this.workspaceInviteDomain.resendInvite(
            workspaceInviteId,
            tokenData
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        await this.sendInviteNotification(
            workspace,
            invite,
            tokenData,
            actorId,
            inviterName,
            recipient
        );

        return { data: invite };
    }

    async revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.assertInvitationAllowed();
        const existing = await this.workspaceInviteDomain.getPendingById(
            workspaceInviteId,
            workspaceId
        );

        const existingUser = await this.userDomain.getOneActiveByEmail(
            existing.email
        );

        const activityLogs = this.prepareInviteActivityLogs(
            EnumActivityLogAction.workspaceInviteRevoked,
            EnumActivityLogAction.workspaceInviteRevokedByAdmin,
            workspaceId,
            actorId,
            workspaceInviteId,
            existingUser
        );

        await this.workspaceInviteDomain.revokeInvite(workspaceInviteId);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async claimInvite(
        userId: string,
        userEmail: string,
        { inviteToken }: WorkspaceInviteClaimRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.assertInvitationAllowed();

        const invite = await this.workspaceInviteDomain.validateInviteForEmail(
            inviteToken,
            userEmail
        );
        // Sequential by design: gate before the work it guards
        await this.workspaceInviteDomain.assertInviteeNotMember(
            invite.workspaceId,
            userId
        );

        const acceptedAt = this.helperDateService.create();
        await this.databaseService.withTransaction(async tx => {
            await this.workspaceInviteDomain.acceptPendingInTx(
                tx,
                invite.id,
                userId,
                acceptedAt
            );
            await this.workspaceMemberDomain.createInTx(
                tx,
                invite.workspaceId,
                userId,
                invite.workspaceRole,
                userId
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
        });

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceInviteAccepted,
                userId,
                createdBy: userId,
                workspaceId: invite.workspaceId,
                metadata: { targetUserId: invite.invitedByUserId },
            }),
        ];
        if (invite.invitedByUserId !== userId) {
            const acceptedByInviteeActivityLog = this.activityLogDomain.prepare(
                {
                    action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                    userId: invite.invitedByUserId,
                    createdBy: userId,
                    workspaceId: invite.workspaceId,
                    metadata: { actorUserId: userId },
                }
            );
            activityLogs.push(acceptedByInviteeActivityLog);
        }
        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async previewInvite({
        inviteToken,
    }: WorkspaceInvitePreviewRequestDto): Promise<
        IResponseReturn<WorkspaceInvitePreviewResponseDto>
    > {
        // Sequential by design: gate before the work it guards
        await this.assertInvitationAllowed();

        const invite =
            await this.workspaceInviteDomain.validateInviteToken(inviteToken);
        const [workspace, inviter] = await Promise.all([
            this.workspaceInviteDomain.getWorkspaceOfInvite(invite),
            this.userDomain.getNameById(invite.invitedByUserId),
        ]);

        const preview = this.workspaceUtil.mapInvitePreview(
            workspace,
            invite,
            inviter
        );

        return { data: preview };
    }
}
