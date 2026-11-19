import { UserUtil } from '@modules/user/utils/user.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceResendInviteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IWorkspaceContext,
        string,
        WorkspaceInviteResendRequestDto,
    ],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly userUtil: UserUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        workspaceContext: IWorkspaceContext,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const existing = await this.workspaceInviteService.getResendableById(
            workspaceInviteId,
            workspaceContext.workspace.id
        );

        const inviterName = this.userUtil.getDisplayName(userContext.user);
        const existingUser = await this.userService.getOneActiveByEmail(
            existing.email
        );

        const { invite } = await this.workspaceInviteService.resendInvite(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceInviteId,
            expiryDuration ?? null,
            {
                workspaceName: workspaceContext.workspace.name,
                inviterName,
                inviteeUserId: existingUser?.id ?? null,
            }
        );

        return { data: invite };
    }
}
