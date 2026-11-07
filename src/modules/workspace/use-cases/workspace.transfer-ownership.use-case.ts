import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceTransferOwnershipUseCase implements IAppUseCase<
    [string, WorkspaceMember, WorkspaceTransferOwnershipRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        workspaceId: string,
        actorMember: WorkspaceMember,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: actorMember.userId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { targetUserId },
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: targetUserId,
                createdBy: actorMember.userId,
                workspaceId,
                metadata: { actorUserId: actorMember.userId },
            }),
        ];

        await this.workspaceMemberService.transferOwnership(
            workspaceId,
            actorMember,
            targetUserId
        );

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
