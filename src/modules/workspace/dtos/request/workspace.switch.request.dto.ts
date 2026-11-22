import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/** @public */
export const WorkspaceSwitchRequestSchema = z.strictObject({
    workspaceId: RequestUuidSchema.meta({
        description:
            'Workspace to switch into; caller must already be a member',
        example: faker.string.uuid(),
    }),
});

/** @public */
export type WorkspaceSwitchRequestDto = z.infer<
    typeof WorkspaceSwitchRequestSchema
>;
