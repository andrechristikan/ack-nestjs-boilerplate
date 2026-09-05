import { z } from 'zod';
import { EnumProjectMemberRole } from '@generated/prisma-client';

export const ProjectMemberUpdateRoleRequestSchema = z.strictObject({
    role: z.enum(EnumProjectMemberRole).meta({
        description:
            'New project member role; setting or changing admin requires the caller to be workspace owner or admin',
        example: EnumProjectMemberRole.member,
    }),
});

export type ProjectMemberUpdateRoleRequestDto = z.infer<
    typeof ProjectMemberUpdateRoleRequestSchema
>;
