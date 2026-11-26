import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';

/** @public */
export const WorkspaceJoinRequestCreateRequestSchema = z.strictObject({
    workspaceId: RequestMongoIdSchema.meta({
        description:
            'Workspace to request joining; must be isPublic and not soft-deleted',
        example: faker.database.mongodbObjectId(),
    }),
    message: z.string().trim().toLowerCase().max(500).optional().meta({
        description:
            'Optional note to the workspace owners/admins reviewing the request',
        example: faker.lorem.sentence().toLowerCase(),
    }),
});

/** @public */
export type WorkspaceJoinRequestCreateRequestDto = z.infer<
    typeof WorkspaceJoinRequestCreateRequestSchema
>;
