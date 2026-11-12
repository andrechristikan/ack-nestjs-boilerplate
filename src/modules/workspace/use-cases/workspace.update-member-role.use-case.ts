import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateMemberRoleUseCase implements IAppUseCase<
    [
        string,
        WorkspaceMember,
        string,
        WorkspaceMemberUpdateRoleRequestDto,
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
        targetMemberId: string,
        { role }: WorkspaceMemberUpdateRoleRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.workspaceMemberService.updateMemberRole(
            workspaceId,
            actorMember,
            targetMemberId,
            role,
            context
        );

        return {};
    }
}
