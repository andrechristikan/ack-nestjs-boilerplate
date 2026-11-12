import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type {
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
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
        private readonly activityLogService: ActivityLogService
    ) {}

    /** Temporary: recordEffect inside the transaction (phase 3D). */
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
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const existing = await this.workspaceInviteService.getResendableById(
            workspaceInviteId,
            workspace.id
        );

        const [inviterName, existingUser] = await Promise.all([
            this.workspaceInviteService.getInviterName(workspace, actorId),
            this.userService.getOneActiveByEmail(existing.email),
        ]);

        const activityLogs = this.prepareInviteActivityLogs(
            EnumActivityLogAction.workspaceInviteResent,
            EnumActivityLogAction.workspaceInviteResentByAdmin,
            workspace.id,
            actorId,
            workspaceInviteId,
            existingUser
        );

        const { invite } = await this.workspaceInviteService.resendInvite(
            workspaceInviteId,
            expiryDuration ?? null,
            actorId,
            {
                workspaceName: workspace.name,
                inviterName,
                inviteeUserId: existingUser?.id ?? null,
            }
        );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: invite };
    }
}
