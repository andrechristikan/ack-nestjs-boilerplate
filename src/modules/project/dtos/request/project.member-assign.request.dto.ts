import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';

/**
 * Validates the body for assigning a workspace member to a project.
 * @public
 */
export const ProjectMemberAssignRequestSchema = z.strictObject({
    userId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
            description:
                'User id to assign to the project; must already be a member of the parent workspace',
            example: faker.string.uuid(),
        }),
    role: z.enum(EnumProjectMemberRole).meta({
        description:
            'Project member role; assigning admin requires the caller to be workspace owner or admin',
        example: EnumProjectMemberRole.member,
    }),
});

/**
 * Body for assigning a workspace member to a project.
 * @public
 */
export type ProjectMemberAssignRequestDto = z.infer<
    typeof ProjectMemberAssignRequestSchema
>;
