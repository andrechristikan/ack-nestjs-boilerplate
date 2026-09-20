import { z } from 'zod';

/**
 * Validates the body for changing a project slug.
 * @public
 */
export const ProjectUpdateSlugRequestSchema = z.strictObject({
    slug: z.string().min(1).meta({
        description:
            'New project slug. Charset [0-9a-zA-Z-], length capped by the project slug configuration (30 characters), unique per workspace',
        example: 'website-revamp',
    }),
});

/**
 * Body for changing a project slug.
 * @public
 */
export type ProjectUpdateSlugRequestDto = z.infer<
    typeof ProjectUpdateSlugRequestSchema
>;
