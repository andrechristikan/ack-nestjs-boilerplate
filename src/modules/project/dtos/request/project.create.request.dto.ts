import { z } from 'zod';

/** @public */
export const ProjectCreateRequestSchema = z.strictObject({
    name: z.string().trim().toLowerCase().min(1).max(150).meta({
        description: 'Project name',
        example: 'website revamp',
    }),
    description: z.string().trim().toLowerCase().max(500).optional().meta({
        description: 'Project description',
        example: 'marketing site redesign',
    }),
});

/** @public */
export type ProjectCreateRequestDto = z.infer<
    typeof ProjectCreateRequestSchema
>;
