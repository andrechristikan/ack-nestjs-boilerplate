import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { ProjectMemberAssignRequestDto } from '@modules/project/dtos/request/project.member-assign.request.dto';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectAssignMemberUseCase implements IAppUseCase<
    [Project, WorkspaceMember, ProjectMemberAssignRequestDto],
    IResponseReturn<IProjectMember>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectUtil: ProjectUtil,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        project: Project,
        actorMember: WorkspaceMember,
        { userId, role }: ProjectMemberAssignRequestDto
    ): Promise<IResponseReturn<IProjectMember>> {
        const actor = this.projectUtil.mapMemberActor(actorMember);
        const actorId = actor.userId;
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { targetUserId: userId },
            }),
        ];
        if (userId !== actorId) {
            const assignedByAdminActivityLog = this.activityLogService.prepare({
                action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                userId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
                metadata: { actorUserId: actorId },
            });
            activityLogs.push(assignedByAdminActivityLog);
        }

        const targetMember =
            await this.workspaceMemberService.getOneByWorkspaceAndUser(
                project.workspaceId,
                userId
            );
        const member = await this.projectMemberService.assignMember(
            project,
            actor,
            targetMember,
            role
        );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: member };
    }
}
