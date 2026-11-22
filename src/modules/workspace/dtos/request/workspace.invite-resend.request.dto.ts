import { z } from 'zod';
import { WorkspaceInviteCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';

/** @public */
export const WorkspaceInviteResendRequestSchema =
    WorkspaceInviteCreateRequestSchema.pick({ expiryDuration: true });

/** @public */
export type WorkspaceInviteResendRequestDto = z.infer<
    typeof WorkspaceInviteResendRequestSchema
>;
