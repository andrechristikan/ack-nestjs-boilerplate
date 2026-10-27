import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/**
 * Validates the body for requesting to join a public workspace.
 * @public
 */
export const WorkspaceJoinRequestCreateRequestSchema = z.strictObject({
    workspaceId: RequestUuidSchema.meta({
        description:
            'Workspace to request joining; must be isPublic and not soft-deleted',
        example: faker.string.uuid(),
    }),
    message: z.string().max(500).optional().meta({
        description:
            'Optional note to the workspace owners/admins reviewing the request',
        example: faker.lorem.sentence(),
    }),
});

/**
 * Body for requesting to join a public workspace.
 * @public
 */
export type WorkspaceJoinRequestCreateRequestDto = z.infer<
    typeof WorkspaceJoinRequestCreateRequestSchema
>;
