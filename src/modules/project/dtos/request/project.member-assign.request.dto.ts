import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumProjectMemberRole } from '@generated/prisma-client';

export const ProjectMemberAssignRequestSchema = z.strictObject({
    userId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
            description:
                'User id to assign to the project; must already be a member of the parent workspace',
            example: faker.database.mongodbObjectId(),
        }),
    role: z.enum(EnumProjectMemberRole).meta({
        description:
            'Project member role; assigning admin requires the caller to be workspace owner or admin',
        example: EnumProjectMemberRole.member,
    }),
});

export type ProjectMemberAssignRequestDto = z.infer<
    typeof ProjectMemberAssignRequestSchema
>;
