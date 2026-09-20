import { z } from 'zod';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';

/**
 * Validates the body for changing a project member role.
 * @public
 */
export const ProjectMemberUpdateRoleRequestSchema = z.strictObject({
    role: z.enum(EnumProjectMemberRole).meta({
        description:
            'New project member role; setting or changing admin requires the caller to be workspace owner or admin',
        example: EnumProjectMemberRole.member,
    }),
});

/**
 * Body for changing a project member role.
 * @public
 */
export type ProjectMemberUpdateRoleRequestDto = z.infer<
    typeof ProjectMemberUpdateRoleRequestSchema
>;
