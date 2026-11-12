import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type {
    Project,
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ProjectService } from '@modules/project/services/project.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type { IWorkspaceInviteCreate } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceCreateInviteUseCase implements IAppUseCase<
    [Workspace, string, WorkspaceInviteCreateRequestDto],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly projectService: ProjectService,
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
        {
            email,
            workspaceRole,
            projectId,
            projectRole,
            expiryDuration,
        }: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        const create: IWorkspaceInviteCreate = {
            email,
            workspaceRole,
            projectId: projectId ?? null,
            projectRole: projectRole ?? null,
            expiryDuration: expiryDuration ?? null,
        };
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.workspaceInviteService.assertProjectRolePaired(create);

        let projectLookup: Promise<Project | null> | null = null;
        if (create.projectId !== null) {
            projectLookup = this.projectService.getActiveByIdAndWorkspace(
                create.projectId,
                workspace.id
            );
        }

        const [project, existingUser] = await Promise.all([
            projectLookup,
            this.userService.getOneActiveByEmail(create.email),
        ]);
        this.workspaceInviteService.assertCreatable(create, project);
        if (existingUser) {
            await this.workspaceInviteService.assertInviteeNotMember(
                workspace.id,
                existingUser.id
            );
        }

        const inviterName = await this.workspaceInviteService.getInviterName(
            workspace,
            actorId
        );
        const { invite } = await this.workspaceInviteService.createInvite(
            workspace.id,
            actorId,
            create,
            {
                workspaceName: workspace.name,
                inviterName,
                inviteeUserId: existingUser?.id ?? null,
            }
        );

        const activityLogs = this.prepareInviteActivityLogs(
            EnumActivityLogAction.workspaceInviteCreated,
            EnumActivityLogAction.workspaceInviteCreatedByAdmin,
            workspace.id,
            actorId,
            invite.id,
            existingUser
        );
        this.activityLogService.stagePrepared(activityLogs);

        return { data: invite };
    }
}
