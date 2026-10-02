import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/**
 * Validates the body for assigning a workspace member to a project.
 * @public
 */
export const ProjectMemberAssignRequestSchema = z.strictObject({
    userId: RequestUuidSchema.meta({
        description:
            'User id to assign to the project; must already be a member of the parent workspace',
        examples: [faker.string.uuid()],
    }),
    roleId: RequestUuidSchema.meta({
        description:
            'Id of the project role, taken from the shared role list with scope project; assigning the admin role requires the caller to hold manage on project members',
        examples: [faker.string.uuid()],
    }),
});

/**
 * Body for assigning a workspace member to a project.
 * @public
 */
export type ProjectMemberAssignRequestDto = z.infer<
    typeof ProjectMemberAssignRequestSchema
>;
