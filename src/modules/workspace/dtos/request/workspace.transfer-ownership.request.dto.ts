import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/**
 * Validates the body for transferring workspace ownership.
 * @public
 */
export const WorkspaceTransferOwnershipRequestSchema = z.strictObject({
    targetUserId: RequestUuidSchema.meta({
        description:
            'User to transfer ownership to; must already be a workspace member',
        example: faker.string.uuid(),
    }),
});

/**
 * Body for transferring workspace ownership.
 * @public
 */
export type WorkspaceTransferOwnershipRequestDto = z.infer<
    typeof WorkspaceTransferOwnershipRequestSchema
>;
