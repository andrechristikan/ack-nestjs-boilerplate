import { z } from 'zod';
import { WorkspaceInviteCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';

/**
 * Validates the body for resending a workspace invite.
 * @public
 */
export const WorkspaceInviteResendRequestSchema =
    WorkspaceInviteCreateRequestSchema.pick({ expiryDuration: true });

/**
 * Body for resending a workspace invite.
 * @public
 */
export type WorkspaceInviteResendRequestDto = z.infer<
    typeof WorkspaceInviteResendRequestSchema
>;
