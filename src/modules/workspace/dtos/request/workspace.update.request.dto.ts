import { z } from 'zod';

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

export type WorkspaceUpdateRequestDto = z.infer<
    typeof WorkspaceUpdateRequestSchema
>;
