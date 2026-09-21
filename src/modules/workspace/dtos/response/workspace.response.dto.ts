import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

/**
 * Base workspace shape: the stored workspace row.
 * @public
 */
export const WorkspaceResponseSchema = DatabaseResponseSchema.extend({
    name: z.string().meta({
        description: 'Workspace name',
        example: 'Acme',
    }),
    slug: z.string().meta({
        description: 'Workspace slug',
        example: 'acme-team',
    }),
    description: z.string().nullable().meta({
        description: 'Workspace description',
        example: 'Our team workspace',
    }),
    isPublic: z.boolean().meta({
        description:
            'Whether the workspace is publicly discoverable for join requests',
        example: false,
    }),
});

/**
 * Stored workspace.
 * @public
 */
export type WorkspaceResponseDto = z.infer<typeof WorkspaceResponseSchema>;
