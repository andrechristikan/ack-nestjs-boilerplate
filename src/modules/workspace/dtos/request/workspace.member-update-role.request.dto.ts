import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/**
 * Validates the body for changing a workspace member role.
 * @public
 */
export const WorkspaceMemberUpdateRoleRequestSchema = z.strictObject({
    roleId: RequestUuidSchema.meta({
        description:
            'Id of the new workspace role, taken from the shared role list with scope workspace; the owner role is never assignable through this endpoint (use ownership transfer)',
        example: faker.string.uuid(),
    }),
});

/**
 * Body for changing a workspace member role.
 * @public
 */
export type WorkspaceMemberUpdateRoleRequestDto = z.infer<
    typeof WorkspaceMemberUpdateRoleRequestSchema
>;
