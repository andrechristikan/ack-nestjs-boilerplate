import { DatabaseService } from '@common/database/services/database.service';
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
        private readonly userUtil: UserUtil,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        const create = { workspaceId, message: message ?? null };
        const [{ workspace, reviewerIds }, prepared] = await Promise.all([
            this.workspaceJoinRequestService.getJoinableWorkspace(
                authContext.userId,
                workspaceId
            ),
            this.workspaceJoinRequestService.prepareJoinRequest(
                authContext,
                create
            ),
            this.workspaceJoinRequestService.assertJoinRequestAllowed(),
        ]);
        const requesterName = this.userUtil.getDisplayName(userContext.user);

        const joinRequest = await this.databaseService.withTransaction(
            async tx =>
                this.workspaceJoinRequestService.createJoinRequestInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    create,
                    prepared,
                    {
                        workspaceName: workspace.name,
                        requesterName,
                        reviewerIds,
                    }
                )
        );

        return { data: joinRequest };
    }
}
