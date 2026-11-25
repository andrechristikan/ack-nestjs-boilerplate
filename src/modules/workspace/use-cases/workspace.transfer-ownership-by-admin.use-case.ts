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

@Injectable()
export class WorkspaceTransferOwnershipByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        string,
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
        workspaceId: string,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto
    ): Promise<IResponseReturn<void>> {
        const [transfer] = await Promise.all([
            this.workspaceMemberService.getTransferByAdmin(
                workspaceId,
                targetUserId
            ),
            this.workspaceService.assertOwnedCapAvailable(targetUserId),
        ]);

        await this.databaseService.withTransaction(async tx =>
            this.workspaceMemberService.transferOwnershipByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                workspaceId,
                transfer
            )
        );

        return {};
    }
}
