import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';

/** @public */
export const WorkspaceTransferOwnershipRequestSchema = z.strictObject({
    targetUserId: RequestMongoIdSchema.meta({
        description:
            'User to transfer ownership to; must already be a workspace member',
        example: faker.database.mongodbObjectId(),
    }),
});

/** @public */
export type WorkspaceTransferOwnershipRequestDto = z.infer<
    typeof WorkspaceTransferOwnershipRequestSchema
>;
