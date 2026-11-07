import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInvitePreviewRequestDto } from '@modules/workspace/dtos/request/workspace.invite-preview.request.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspacePreviewInviteUseCase implements IAppUseCase<
    [WorkspaceInvitePreviewRequestDto],
    IResponseReturn<WorkspaceInvitePreviewResponseDto>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    async execute({
        inviteToken,
    }: WorkspaceInvitePreviewRequestDto): Promise<
        IResponseReturn<WorkspaceInvitePreviewResponseDto>
    > {
        const invite =
            await this.workspaceInviteService.validateInviteToken(inviteToken);
        const [workspace, inviter] = await Promise.all([
            this.workspaceInviteService.getWorkspaceOfInvite(invite),
            this.userService.getNameById(invite.invitedByUserId),
        ]);

        const preview = this.workspaceUtil.mapInvitePreview(
            workspace,
            invite,
            inviter
        );

        return { data: preview };
    }
}
