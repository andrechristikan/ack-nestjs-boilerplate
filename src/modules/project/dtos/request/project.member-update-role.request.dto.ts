import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/** @public */
export const ProjectMemberUpdateRoleRequestSchema = z.strictObject({
    roleId: RequestUuidSchema.meta({
        description:
            'Id of the new project role, taken from the shared role list with scope project; setting or changing admin requires the caller to be workspace owner or admin',
        example: faker.string.uuid(),
    }),
});

/** @public */
export type ProjectMemberUpdateRoleRequestDto = z.infer<
    typeof ProjectMemberUpdateRoleRequestSchema
>;
