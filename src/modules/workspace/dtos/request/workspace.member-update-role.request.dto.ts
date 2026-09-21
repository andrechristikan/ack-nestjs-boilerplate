import { z } from 'zod';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';

/**
 * Validates the body for changing a workspace member role.
 * @public
 */
export const WorkspaceMemberUpdateRoleRequestSchema = z.strictObject({
    role: z
        .enum([EnumWorkspaceMemberRole.admin, EnumWorkspaceMemberRole.member])
        .meta({
            description:
                'New workspace member role; owner is never assignable through this endpoint (use ownership/transfer)',
            example: EnumWorkspaceMemberRole.admin,
        }),
});

/**
 * Body for changing a workspace member role.
 * @public
 */
export type WorkspaceMemberUpdateRoleRequestDto = z.infer<
    typeof WorkspaceMemberUpdateRoleRequestSchema
>;
