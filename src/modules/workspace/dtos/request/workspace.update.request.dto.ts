import { z } from 'zod';

/** @public */
export const WorkspaceUpdateRequestSchema = z.strictObject({
    name: z.string().min(1).max(150).meta({
        description: 'Workspace name',
        example: 'Acme',
    }),
    description: z.string().max(500).nullable().meta({
        description: 'Workspace description; null clears it',
        example: 'Our team workspace',
    }),
});

/** @public */
export type WorkspaceUpdateRequestDto = z.infer<
    typeof WorkspaceUpdateRequestSchema
>;
