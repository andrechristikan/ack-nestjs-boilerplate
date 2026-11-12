import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceCreateJoinRequestUseCase implements IAppUseCase<
    [string, WorkspaceJoinRequestCreateRequestDto],
    IResponseReturn<WorkspaceJoinRequest>
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly userService: UserService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.workspaceJoinRequestService.assertJoinRequestAllowed();
        const workspace =
            await this.workspaceJoinRequestService.getJoinableWorkspace(
                userId,
                workspaceId
            );

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceJoinRequested,
                userId,
                createdBy: userId,
                workspaceId: workspace.id,
            }),
        ];

        const [requester, reviewerIds] = await Promise.all([
            this.userService.getNameById(userId),
            this.workspaceMemberService.getReviewerUserIds(workspace.id),
        ]);
        const requesterName =
            this.workspaceJoinRequestService.resolveRequesterName(requester);
        const joinRequest =
            await this.workspaceJoinRequestService.createJoinRequest(
                userId,
                { workspaceId, message: message ?? null },
                { workspaceName: workspace.name, requesterName, reviewerIds }
            );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: joinRequest };
    }
}
