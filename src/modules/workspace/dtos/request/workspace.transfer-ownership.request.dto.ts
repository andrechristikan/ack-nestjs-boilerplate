import { z } from 'zod';
import { faker } from '@faker-js/faker';

export const WorkspaceTransferOwnershipRequestSchema = z.strictObject({
    targetUserId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
            description:
                'User to transfer ownership to; must already be a workspace member',
            example: faker.string.uuid(),
        }),
});

export type WorkspaceTransferOwnershipRequestDto = z.infer<
    typeof WorkspaceTransferOwnershipRequestSchema
>;
