import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceRevokeInviteUseCase implements IAppUseCase<
    [string, string, string, IRequestContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService
    ) {}

    async execute(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        const existing = await this.workspaceInviteService.getPendingById(
            workspaceInviteId,
            workspaceId
        );

        const existingUser = await this.userService.getOneActiveByEmail(
            existing.email
        );

        await this.workspaceInviteService.revokeInvite(
            workspaceInviteId,
            workspaceId,
            actorId,
            existingUser?.id ?? null,
            context
        );

        return {};
    }
}
