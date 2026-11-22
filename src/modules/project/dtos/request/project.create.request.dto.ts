import { z } from 'zod';

/** @public */
export const ProjectCreateRequestSchema = z.strictObject({
    name: z.string().trim().min(1).max(150).meta({
        description: 'Project name',
        example: 'Website Revamp',
    }),
    description: z.string().trim().max(500).optional().meta({
        description: 'Project description',
        example: 'Marketing site redesign',
    }),
});

/** @public */
export type ProjectCreateRequestDto = z.infer<
    typeof ProjectCreateRequestSchema
>;
