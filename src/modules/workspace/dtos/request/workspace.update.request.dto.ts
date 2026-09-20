import { z } from 'zod';

/**
 * Validates the body for updating a workspace name and description.
 * @public
 */
export const WorkspaceUpdateRequestSchema = z.strictObject({
    name: z.string().max(150).optional().meta({
        description: 'Workspace name',
        example: 'Acme',
    }),
    description: z.string().max(500).optional().meta({
        description: 'Workspace description',
        example: 'Our team workspace',
    }),
});

/**
 * Body for updating a workspace name and description.
 * @public
 */
export type WorkspaceUpdateRequestDto = z.infer<
    typeof WorkspaceUpdateRequestSchema
>;
