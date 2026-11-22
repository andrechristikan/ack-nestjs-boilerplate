import { z } from 'zod';
import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client/client';

/** @public */
export const WorkspaceJoinRequestRejectRequestSchema = z.strictObject({
    rejectReasonCode: z.enum(EnumWorkspaceJoinRejectReason).meta({
        description: 'Reason the join request is being rejected',
        example: EnumWorkspaceJoinRejectReason.wrongWorkspace,
    }),
});

/** @public */
export type WorkspaceJoinRequestRejectRequestDto = z.infer<
    typeof WorkspaceJoinRequestRejectRequestSchema
>;
