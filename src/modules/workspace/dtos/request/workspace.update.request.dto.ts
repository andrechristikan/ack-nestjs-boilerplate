import { z } from 'zod';

/** @public */
export const WorkspaceUpdateRequestSchema = z.strictObject({
    name: z.string().trim().toLowerCase().min(1).max(150).meta({
        description: 'Workspace name',
        example: 'acme',
    }),
    description: z.string().trim().toLowerCase().max(500).nullable().meta({
        description: 'Workspace description; null clears it',
        example: 'our team workspace',
    }),
});

/** @public */
export type WorkspaceUpdateRequestDto = z.infer<
    typeof WorkspaceUpdateRequestSchema
>;
