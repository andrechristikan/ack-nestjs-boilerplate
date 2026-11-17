import { z } from 'zod';

/** @public */
export const WorkspaceUpdateIsPublicRequestSchema = z.strictObject({
    isPublic: z.boolean().meta({
        description:
            'Whether the workspace is publicly discoverable for join requests',
        example: false,
    }),
});

/** @public */
export type WorkspaceUpdateIsPublicRequestDto = z.infer<
    typeof WorkspaceUpdateIsPublicRequestSchema
>;
