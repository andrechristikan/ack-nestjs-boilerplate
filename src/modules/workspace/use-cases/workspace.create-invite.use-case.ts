import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type {
    Project,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type { IWorkspaceInviteCreate } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceCreateInviteUseCase implements IAppUseCase<
    [Workspace, string, WorkspaceInviteCreateRequestDto, IRequestContext],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly projectService: ProjectService,
        private readonly userService: UserService
    ) {}

    async execute(
        workspace: Workspace,
        actorId: string,
        {
            email,
            workspaceRole,
            projectId,
            projectRole,
            expiryDuration,
        }: WorkspaceInviteCreateRequestDto,
        context: IRequestContext
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
            },
            context
        );

        return { data: invite };
    }
}
