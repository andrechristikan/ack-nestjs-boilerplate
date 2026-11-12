import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceResendInviteUseCase implements IAppUseCase<
    [
        Workspace,
        string,
        string,
        WorkspaceInviteResendRequestDto,
        IRequestContext,
    ],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService
    ) {}

    async execute(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const existing = await this.workspaceInviteService.getResendableById(
            workspaceInviteId,
            workspace.id
        );

        const [inviterName, existingUser] = await Promise.all([
            this.workspaceInviteService.getInviterName(workspace, actorId),
            this.userService.getOneActiveByEmail(existing.email),
        ]);

        const { invite } = await this.workspaceInviteService.resendInvite(
            workspaceInviteId,
            expiryDuration ?? null,
            actorId,
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
