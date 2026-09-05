import { z } from 'zod';

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

export type ProjectCreateRequestDto = z.infer<
    typeof ProjectCreateRequestSchema
>;
