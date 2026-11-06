import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const WorkspaceTransferOwnershipRequestSchema = z.strictObject({
    targetUserId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
            description:
                'User to transfer ownership to; must already be a workspace member',
            example: faker.database.mongodbObjectId(),
        }),
});

/** @public */
export type WorkspaceTransferOwnershipRequestDto = z.infer<
    typeof WorkspaceTransferOwnershipRequestSchema
>;
