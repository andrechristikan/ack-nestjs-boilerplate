import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectLeaveUseCase implements IAppUseCase<
    [Project, ProjectMember],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        project: Project,
        member: ProjectMember
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectMemberLeft,
                userId: member.userId,
                createdBy: member.userId,
                workspaceId: project.workspaceId,
            }),
        ];

        await this.projectMemberService.leaveProject(member);

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
