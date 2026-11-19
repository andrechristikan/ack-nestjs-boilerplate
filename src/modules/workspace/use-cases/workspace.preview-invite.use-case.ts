import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceInvitePreviewRequestDto } from '@modules/workspace/dtos/request/workspace.invite-preview.request.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspacePreviewInviteUseCase implements IAppUseCase<
    [WorkspaceInvitePreviewRequestDto],
    IResponseReturn<WorkspaceInvitePreviewResponseDto>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService
    ) {}

    async execute({
        inviteToken,
    }: WorkspaceInvitePreviewRequestDto): Promise<
        IResponseReturn<WorkspaceInvitePreviewResponseDto>
    > {
        const invite =
            await this.workspaceInviteService.validateInviteToken(inviteToken);
        const preview = this.workspaceInviteService.mapInvitePreview(invite);

        return { data: preview };
    }
}
