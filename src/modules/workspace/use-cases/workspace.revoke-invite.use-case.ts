import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceRevokeInviteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        workspaceInviteId: string
    ): Promise<IResponseReturn<void>> {
        const existing = await this.workspaceInviteService.getPendingById(
            workspaceInviteId,
            workspaceContext.workspace.id
        );

        const existingUser = await this.userService.getOneActiveByEmail(
            existing.email
        );

        await this.databaseService.withTransaction(async tx =>
            this.workspaceInviteService.revokeInviteInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                workspaceInviteId,
                workspaceContext.workspace.id,
                existingUser?.id ?? null
            )
        );

        return {};
    }
}
