import { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { PickType } from '@nestjs/swagger';

export class WorkspaceInviteResendRequestDto extends PickType(
    WorkspaceInviteCreateRequestDto,
    ['expiryDuration'] as const
) {}
