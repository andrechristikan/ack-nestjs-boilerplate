import { z } from 'zod';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client';

export const WorkspaceMemberUpdateRoleRequestSchema = z.strictObject({
    role: z
        .enum([EnumWorkspaceMemberRole.admin, EnumWorkspaceMemberRole.member])
        .meta({
            description:
                'New workspace member role; owner is never assignable through this endpoint (use ownership/transfer)',
            example: EnumWorkspaceMemberRole.admin,
        }),
});

export type WorkspaceMemberUpdateRoleRequestDto = z.infer<
    typeof WorkspaceMemberUpdateRoleRequestSchema
>;
