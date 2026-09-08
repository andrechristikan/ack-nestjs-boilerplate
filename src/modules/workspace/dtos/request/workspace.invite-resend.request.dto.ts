import { z } from 'zod';
import { WorkspaceInviteCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';

export const WorkspaceInviteResendRequestSchema =
    WorkspaceInviteCreateRequestSchema.pick({ expiryDuration: true });

export type WorkspaceInviteResendRequestDto = z.infer<
    typeof WorkspaceInviteResendRequestSchema
>;
