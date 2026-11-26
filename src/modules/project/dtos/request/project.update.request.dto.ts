import { z } from 'zod';

/** @public */
export const ProjectUpdateRequestSchema = z.strictObject({
    name: z.string().trim().toLowerCase().min(1).max(150).meta({
        description: 'Project name',
        example: 'website revamp',
    }),
    description: z.string().trim().toLowerCase().max(500).nullable().meta({
        description: 'Project description; null clears it',
        example: 'marketing site redesign',
    }),
});

/** @public */
export type ProjectUpdateRequestDto = z.infer<
    typeof ProjectUpdateRequestSchema
>;
