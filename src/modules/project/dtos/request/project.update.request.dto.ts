import { z } from 'zod';

/** @public */
export const ProjectUpdateRequestSchema = z.strictObject({
    name: z.string().min(1).max(150).meta({
        description: 'Project name',
        example: 'Website Revamp',
    }),
    description: z.string().max(500).nullable().meta({
        description: 'Project description; null clears it',
        example: 'Marketing site redesign',
    }),
});

/** @public */
export type ProjectUpdateRequestDto = z.infer<
    typeof ProjectUpdateRequestSchema
>;
