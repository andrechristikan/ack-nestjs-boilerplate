import type { IRequestContextWorkspace } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceResendInviteUseCase implements IAppUseCase<
    [IRequestContextWorkspace, string, WorkspaceInviteResendRequestDto],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService
    ) {}

    async execute(
        context: IRequestContextWorkspace,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const existing = await this.workspaceInviteService.getResendableById(
            workspaceInviteId,
            context.workspace.id
        );

        const [inviterName, existingUser] = await Promise.all([
            this.workspaceInviteService.getInviterName(
                context.workspace,
                context.user.id
            ),
            this.userService.getOneActiveByEmail(existing.email),
        ]);

        const { invite } = await this.workspaceInviteService.resendInvite(
            context.snapshot,
            workspaceInviteId,
            expiryDuration ?? null,
            {
                workspaceName: context.workspace.name,
                inviterName,
                inviteeUserId: existingUser?.id ?? null,
            }
        );

        return { data: invite };
    }
}
