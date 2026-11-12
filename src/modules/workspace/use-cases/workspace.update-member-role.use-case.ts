import type { IRequestContextWorkspace } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateMemberRoleUseCase implements IAppUseCase<
    [IRequestContextWorkspace, string, WorkspaceMemberUpdateRoleRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService
    ) {}

    async execute(
        context: IRequestContextWorkspace,
        targetMemberId: string,
        { role }: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.workspaceMemberService.updateMemberRole(
            context.snapshot,
            context.workspace.id,
            context.workspaceMember,
            targetMemberId,
            role
        );

        return {};
    }
}
