import type { IRequestContextWorkspace } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceRevokeInviteUseCase implements IAppUseCase<
    [IRequestContextWorkspace, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService
    ) {}

    async execute(
        context: IRequestContextWorkspace,
        workspaceInviteId: string
    ): Promise<IResponseReturn<void>> {
        const existing = await this.workspaceInviteService.getPendingById(
            workspaceInviteId,
            context.workspace.id
        );

        const existingUser = await this.userService.getOneActiveByEmail(
            existing.email
        );

        await this.workspaceInviteService.revokeInvite(
            context.snapshot,
            workspaceInviteId,
            context.workspace.id,
            existingUser?.id ?? null
        );

        return {};
    }
}
