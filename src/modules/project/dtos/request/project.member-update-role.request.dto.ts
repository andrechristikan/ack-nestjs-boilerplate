import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/**
 * Validates the body for changing a project member role.
 * @public
 */
export const ProjectMemberUpdateRoleRequestSchema = z.strictObject({
    roleId: RequestUuidSchema.meta({
        description:
            'Id of the new project role, taken from the shared role list with scope project; setting or changing the admin role requires the caller to hold manage on project members',
        examples: [faker.string.uuid()],
    }),
});

/**
 * Body for changing a project member role.
 * @public
 */
export type ProjectMemberUpdateRoleRequestDto = z.infer<
    typeof ProjectMemberUpdateRoleRequestSchema
>;
