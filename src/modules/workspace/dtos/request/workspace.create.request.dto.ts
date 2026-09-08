import { z } from 'zod';

export const WorkspaceCreateRequestSchema = z.strictObject({
    name: z.string().min(1).max(150).meta({
        description: 'Workspace name',
        example: 'Acme',
    }),
    description: z.string().max(500).optional().meta({
        description: 'Workspace description',
        example: 'Our team workspace',
    }),
    isPublic: z.boolean().optional().meta({
        description:
            'Whether the workspace is publicly discoverable for join requests',
        example: false,
        default: false,
    }),
});

export type WorkspaceCreateRequestDto = z.infer<
    typeof WorkspaceCreateRequestSchema
>;
