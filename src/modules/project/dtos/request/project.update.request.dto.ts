import { z } from 'zod';

/**
 * Validates the body replacing a project name and description.
 * @public
 */
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

/**
 * Body replacing a project name and description.
 * @public
 */
export type ProjectUpdateRequestDto = z.infer<
    typeof ProjectUpdateRequestSchema
>;
