import { UserUtil } from '@modules/user/utils/user.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class WorkspaceCreateJoinRequestUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        WorkspaceJoinRequestCreateRequestDto,
    ],
    IResponseReturn<WorkspaceJoinRequest>
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly userUtil: UserUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.workspaceJoinRequestService.assertJoinRequestAllowed();
        const { workspace, reviewerIds } =
            await this.workspaceJoinRequestService.getJoinableWorkspace(
                authContext.userId,
                workspaceId
            );
        const requesterName = this.userUtil.getDisplayName(userContext.user);
        const joinRequest =
            await this.workspaceJoinRequestService.createJoinRequest(
                requestContext,
                apiKeyContext,
                authContext,
                { workspaceId, message: message ?? null },
                { workspaceName: workspace.name, requesterName, reviewerIds }
            );

        return { data: joinRequest };
    }
}
