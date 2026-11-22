import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project, WorkspaceInvite } from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type {
    IWorkspaceContext,
    IWorkspaceInviteCreate,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class WorkspaceCreateInviteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        WorkspaceInviteCreateRequestDto,
    ],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly projectService: ProjectService,
        private readonly userService: UserService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
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
                workspaceContext.workspace.id
            );
        }

        const [project, existingUser] = await Promise.all([
            projectLookup,
            this.userService.getOneActiveByEmail(create.email),
        ]);
        this.workspaceInviteService.assertCreatable(create, project);
        if (existingUser) {
            await this.workspaceInviteService.assertInviteeNotMember(
                workspaceContext.workspace.id,
                existingUser.id
            );
        }

        const inviterName = await this.workspaceInviteService.getInviterName(
            workspaceContext.workspace,
            authContext.userId
        );
        const { invite } = await this.workspaceInviteService.createInvite(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext.workspace.id,
            create,
            {
                workspaceName: workspaceContext.workspace.name,
                inviterName,
                inviteeUserId: existingUser?.id ?? null,
            }
        );

        return { data: invite };
    }
}
