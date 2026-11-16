import { z } from 'zod';

/** @public */
export const WorkspaceUpdateSlugRequestSchema = z.strictObject({
    slug: z.string().min(1).max(100).meta({
        description:
            'New workspace slug. Charset [0-9a-zA-Z-], length capped by the workspace slug configuration (30 characters); the request accepts at most 100 characters',
        example: 'acme-team',
    }),
});

/** @public */
export type WorkspaceUpdateSlugRequestDto = z.infer<
    typeof WorkspaceUpdateSlugRequestSchema
>;
