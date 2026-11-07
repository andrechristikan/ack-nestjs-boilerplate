import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { ProjectMemberUpdateRoleRequestDto } from '@modules/project/dtos/request/project.member-update-role.request.dto';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectUpdateMemberRoleUseCase implements IAppUseCase<
    [Project, WorkspaceMember, string, ProjectMemberUpdateRoleRequestDto],
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
        targetMemberId: string,
        { role }: ProjectMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        const actorId = actor.userId;
        const targetMember = await this.projectMemberService.updateMemberRole(
            project,
            actor,
            targetMemberId,
            role
        );
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectMemberRoleUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: targetMember.userId },
            }),
        ];
        if (targetMember.userId !== actorId) {
            const roleUpdatedByAdminActivityLog =
                this.activityLogService.prepare({
                    action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                    userId: targetMember.userId,
                    createdBy: actorId,
                    workspaceId: project.workspaceId,
                    metadata: { actorUserId: actorId },
                });
            activityLogs.push(roleUpdatedByAdminActivityLog);
        }

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
