import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectRemoveMemberUseCase implements IAppUseCase<
    [Project, WorkspaceMember, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly projectUtil: ProjectUtil,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        project: Project,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<IResponseReturn<void>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        const actorId = actor.userId;
        const targetMember = await this.projectMemberService.removeMember(
            project,
            actor,
            targetMemberId
        );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectMemberRemoved,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                userId: targetMember.userId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: actorId },
            }),
        ];

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
