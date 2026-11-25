import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceTransferOwnershipUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        WorkspaceTransferOwnershipRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly workspaceService: WorkspaceService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto
    ): Promise<IResponseReturn<void>> {
        const workspaceId = workspaceContext.workspace.id;
        const actorMember = workspaceContext.workspaceMember;
        const [targetMember] = await Promise.all([
            this.workspaceMemberService.getTransferTarget(
                authContext,
                workspaceId,
                targetUserId
            ),
            this.workspaceService.assertOwnedCapAvailable(targetUserId),
        ]);

        await this.databaseService.withTransaction(async tx =>
            this.workspaceMemberService.transferOwnershipInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                workspaceId,
                actorMember,
                targetMember
            )
        );

        return {};
    }
}
