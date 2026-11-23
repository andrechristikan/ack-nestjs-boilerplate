import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleService } from '@modules/role/services/role.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
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
        private readonly roleService: RoleService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService
    ) {}

    async execute({
        inviteToken,
    }: WorkspaceInvitePreviewRequestDto): Promise<
        IResponseReturn<WorkspaceInvitePreviewResponseDto>
    > {
        const invite =
            await this.workspaceInviteService.validateInviteToken(inviteToken);
        const [workspace, inviter, workspaceRole] = await Promise.all([
            this.workspaceInviteService.getWorkspaceOfInvite(invite),
            this.userService.getNameById(invite.invitedByUserId),
            this.roleService.getRefByIdForScope(
                invite.workspaceRoleId,
                EnumRoleScope.workspace
            ),
        ]);

        const preview = this.workspaceInviteService.mapInvitePreview(
            workspace,
            invite,
            inviter,
            workspaceRole
        );

        return { data: preview };
    }
}
