import { z } from 'zod';
import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client/client';

/**
 * Validates the body for rejecting a workspace join request.
 * @public
 */
export const WorkspaceJoinRequestRejectRequestSchema = z.strictObject({
    rejectReasonCode: z.enum(EnumWorkspaceJoinRejectReason).meta({
        description: 'Reason the join request is being rejected',
        example: EnumWorkspaceJoinRejectReason.wrongWorkspace,
    }),
});

/**
 * Body for rejecting a workspace join request.
 * @public
 */
export type WorkspaceJoinRequestRejectRequestDto = z.infer<
    typeof WorkspaceJoinRequestRejectRequestSchema
>;
