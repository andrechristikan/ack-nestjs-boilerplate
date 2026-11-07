import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateMemberRoleUseCase implements IAppUseCase<
    [string, WorkspaceMember, string, WorkspaceMemberUpdateRoleRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        { role }: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        const targetMember = await this.workspaceMemberService.updateMemberRole(
            workspaceId,
            actorMember,
            targetMemberId,
            role
        );

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                userId: targetMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];
        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
