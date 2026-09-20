import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Validates the body for requesting to join a public workspace.
 * @public
 */
export const WorkspaceJoinRequestCreateRequestSchema = z.strictObject({
    workspaceId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
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
