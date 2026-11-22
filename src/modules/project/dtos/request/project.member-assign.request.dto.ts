import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';

/** @public */
export const ProjectMemberAssignRequestSchema = z.strictObject({
    userId: RequestUuidSchema.meta({
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

/** @public */
export type ProjectMemberAssignRequestDto = z.infer<
    typeof ProjectMemberAssignRequestSchema
>;
