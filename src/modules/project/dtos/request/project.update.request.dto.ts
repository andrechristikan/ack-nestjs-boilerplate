import { z } from 'zod';

/**
 * Validates the body for updating a project name and description.
 * @public
 */
export const ProjectUpdateRequestSchema = z.strictObject({
    name: z.string().max(150).optional().meta({
        description: 'Project name',
        example: 'Website Revamp',
    }),
    description: z.string().max(500).optional().meta({
        description: 'Project description',
        example: 'Marketing site redesign',
    }),
});

/**
 * Body for updating a project name and description.
 * @public
 */
export type ProjectUpdateRequestDto = z.infer<
    typeof ProjectUpdateRequestSchema
>;
