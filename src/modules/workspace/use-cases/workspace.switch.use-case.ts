import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceSwitchUseCase implements IAppUseCase<
    [string, WorkspaceSwitchRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly userService: UserService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        { workspaceId }: WorkspaceSwitchRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        await this.workspaceService.validateWorkspaceGuard(workspaceId);
        await this.workspaceMemberService.validateWorkspaceMemberGuard(
            workspaceId,
            userId
        );

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceSwitched,
                userId,
                createdBy: userId,
                workspaceId,
            }),
        ];

        await this.userService.setLastWorkspace(userId, workspaceId);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
