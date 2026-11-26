import { z } from 'zod';

/** @public */
export const WorkspaceCreateRequestSchema = z.strictObject({
    name: z.string().trim().toLowerCase().min(1).max(150).meta({
        description: 'Workspace name',
        example: 'acme',
    }),
    description: z.string().trim().toLowerCase().max(500).optional().meta({
        description: 'Workspace description',
        example: 'our team workspace',
    }),
    isPublic: z.boolean().optional().meta({
        description:
            'Whether the workspace is publicly discoverable for join requests',
        example: false,
        default: false,
    }),
});

/** @public */
export type WorkspaceCreateRequestDto = z.infer<
    typeof WorkspaceCreateRequestSchema
>;
