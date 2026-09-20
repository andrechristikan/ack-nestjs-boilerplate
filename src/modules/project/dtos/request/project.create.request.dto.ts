import { z } from 'zod';

/**
 * Validates the body for creating a project.
 * @public
 */
export const ProjectCreateRequestSchema = z.strictObject({
    name: z.string().min(1).max(150).meta({
        description: 'Project name',
        example: 'Website Revamp',
    }),
    description: z.string().max(500).optional().meta({
        description: 'Project description',
        example: 'Marketing site redesign',
    }),
});

/**
 * Body for creating a project.
 * @public
 */
export type ProjectCreateRequestDto = z.infer<
    typeof ProjectCreateRequestSchema
>;
