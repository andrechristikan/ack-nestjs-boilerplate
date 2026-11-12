import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceTransferOwnershipUseCase implements IAppUseCase<
    [
        string,
        WorkspaceMember,
        WorkspaceTransferOwnershipRequestDto,
        IRequestContext,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService
    ) {}

    async execute(
        workspaceId: string,
        actorMember: WorkspaceMember,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.workspaceMemberService.transferOwnership(
            workspaceId,
            actorMember,
            targetUserId,
            context
        );

        return {};
    }
}
