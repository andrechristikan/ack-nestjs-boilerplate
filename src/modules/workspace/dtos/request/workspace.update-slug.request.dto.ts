import { z } from 'zod';

/**
 * Validates the body for changing a workspace slug.
 * @public
 */
export const WorkspaceUpdateSlugRequestSchema = z.strictObject({
    slug: z.string().min(1).meta({
        description:
            'New workspace slug. Charset [0-9a-zA-Z-], length capped by the workspace slug configuration (30 characters)',
        example: 'acme-team',
    }),
});

/**
 * Body for changing a workspace slug.
 * @public
 */
export type WorkspaceUpdateSlugRequestDto = z.infer<
    typeof WorkspaceUpdateSlugRequestSchema
>;
