import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type {
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import type {
    IWorkspaceInviteInvitee,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceResendInviteUseCase implements IAppUseCase<
    [Workspace, string, string, WorkspaceInviteResendRequestDto],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    private async getInviterName(
        workspace: Workspace,
        actorId: string
    ): Promise<string> {
        const inviter = await this.userService.getNameById(actorId);

        return this.workspaceUtil.resolveInviterName(inviter, workspace);
    }

    private async getInviteeRecipient(
        existingUser: User | null
    ): Promise<INotificationRecipient | null> {
        if (!existingUser) {
            return null;
        }

        return this.notificationService.getRecipient(
            existingUser,
            EnumNotificationKind.workspaceInvite
        );
    }

    private async getInviteeByEmail(
        email: string
    ): Promise<IWorkspaceInviteInvitee> {
        const existingUser = await this.userService.getOneActiveByEmail(email);
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
            this.activityLogService.prepare({
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
            const byAdminActivityLog = this.activityLogService.prepare({
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

    async execute(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        const existing = await this.workspaceInviteService.getResendableById(
            workspaceInviteId,
            workspace.id
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
        const { invite, tokenData } =
            await this.workspaceInviteService.resendInvite(
                workspaceInviteId,
                expiryDuration ?? null
            );

        this.activityLogService.stagePrepared(activityLogs);

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
}
