import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceRevokeInviteUseCase implements IAppUseCase<
    [string, string, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly activityLogService: ActivityLogService
    ) {}

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

    async execute(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<IResponseReturn<void>> {
        const existing = await this.workspaceInviteService.getPendingById(
            workspaceInviteId,
            workspaceId
        );

        const existingUser = await this.userService.getOneActiveByEmail(
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

        await this.workspaceInviteService.revokeInvite(workspaceInviteId);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
