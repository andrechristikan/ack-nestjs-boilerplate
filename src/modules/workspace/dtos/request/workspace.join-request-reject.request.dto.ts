import { z } from 'zod';
import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client';

export const WorkspaceJoinRequestRejectRequestSchema = z.strictObject({
    rejectReasonCode: z.enum(EnumWorkspaceJoinRejectReason).meta({
        description: 'Reason the join request is being rejected',
        example: EnumWorkspaceJoinRejectReason.wrongWorkspace,
    }),
});

export type WorkspaceJoinRequestRejectRequestDto = z.infer<
    typeof WorkspaceJoinRequestRejectRequestSchema
>;
