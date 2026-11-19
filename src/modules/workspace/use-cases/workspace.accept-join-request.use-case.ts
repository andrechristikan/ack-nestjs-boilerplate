import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceAcceptJoinRequestUseCase implements IAppUseCase<
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
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        workspaceJoinRequestId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        await this.workspaceJoinRequestService.assertJoinRequestAllowed();

        await this.workspaceJoinRequestService.acceptJoinRequest(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceJoinRequestId,
            workspaceContext.workspace.id,
            workspaceContext.workspace.name
        );

        return {};
    }
}
