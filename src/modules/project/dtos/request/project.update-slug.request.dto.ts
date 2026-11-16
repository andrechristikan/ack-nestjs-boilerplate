import { z } from 'zod';

/** @public */
export const ProjectUpdateSlugRequestSchema = z.strictObject({
    slug: z.string().min(1).max(100).meta({
        description:
            'New project slug. Charset [0-9a-zA-Z-], length capped by the project slug configuration (30 characters), unique per workspace; the request accepts at most 100 characters',
        example: 'website-revamp',
    }),
});

/** @public */
export type ProjectUpdateSlugRequestDto = z.infer<
    typeof ProjectUpdateSlugRequestSchema
>;
