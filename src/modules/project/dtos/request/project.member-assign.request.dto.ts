import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/** @public */
export const ProjectMemberAssignRequestSchema = z.strictObject({
    userId: RequestUuidSchema.meta({
        description:
            'User id to assign to the project; must already be a member of the parent workspace',
        example: faker.string.uuid(),
    }),
    roleId: RequestUuidSchema.meta({
        description:
            'Id of the project role, taken from the shared role list with scope project; assigning admin requires the caller to be workspace owner or admin',
        example: faker.string.uuid(),
    }),
});

/** @public */
export type ProjectMemberAssignRequestDto = z.infer<
    typeof ProjectMemberAssignRequestSchema
>;
